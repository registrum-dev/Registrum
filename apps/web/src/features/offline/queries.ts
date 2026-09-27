// What this browser has saved, as the screens ask for it.

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import type { BookRecord } from "@/features/shelf/types";
import { queryClient } from "@/lib/query-client";
import { withPendingPosition } from "./pending-positions";
import {
	isCurrent,
	listSaved,
	offlineSupported,
	rewriteRecord,
	type SavedBook,
} from "./storage";

export const offlineKeys = {
	books: ["offline", "books"] as const,
};

function savedBooksQuery() {
	return {
		queryKey: offlineKeys.books,
		queryFn: listSaved,
		enabled: offlineSupported,
		meta: { failure: null },
	};
}

export function invalidateSaved(): Promise<void> {
	return queryClient.invalidateQueries({ queryKey: offlineKeys.books });
}

/** Every book saved here, most recently read first, each where it was last left. */
export function useSavedBooks() {
	return useQuery({
		...savedBooksQuery(),
		select: (saved: SavedBook[]) =>
			saved
				.map((book) => ({ ...book, record: withPendingPosition(book.record) }))
				.sort((a, b) =>
					(b.record.position?.updatedAt ?? b.savedAt).localeCompare(
						a.record.position?.updatedAt ?? a.savedAt,
					),
				),
	});
}

/** One saved book, or null when it is not saved here. */
export function useSavedBook(id: string | undefined) {
	return useQuery({
		...savedBooksQuery(),
		enabled: offlineSupported && Boolean(id),
		select: (saved: SavedBook[]) => {
			const found = saved.find((book) => book.record.id === id);
			return found
				? { ...found, record: withPendingPosition(found.record) }
				: null;
		},
	});
}

/**
 * Keeps the record beside a saved book as the server last gave it, so the
 * book reads the same offline. Not when the file itself has changed: that copy
 * is out of date, and its record has to keep saying so.
 */
export function useKeepSavedRecord(
	record: BookRecord | null | undefined,
	shelfId: string | null,
) {
	// As stored, without a pending position laid over it.
	const saved = useQuery({
		...savedBooksQuery(),
		enabled: offlineSupported && Boolean(record),
		select: (all: SavedBook[]) =>
			all.find((book) => book.record.id === record?.id) ?? null,
	}).data;
	useEffect(() => {
		if (!record || !saved || !shelfId || !isCurrent(saved, record)) return;
		if (JSON.stringify(saved.record) === JSON.stringify(record)) return;
		void rewriteRecord({ ...saved, shelfId, record })
			.then(invalidateSaved)
			.catch((error: unknown) =>
				console.warn("Could not update a saved book's record.", error),
			);
	}, [record, saved, shelfId]);
}
