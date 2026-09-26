// Where the reader stopped, and the moments it is written.

import type { PositionInput } from "@registrum/api/types";
import { type RefObject, useCallback, useEffect, useRef } from "react";
import type { RelocateDetail } from "@/features/reader/foliate";
import { invalidateShelf } from "@/features/shelf/cache";
import {
	markOpened,
	savePosition,
	savePositionOnLeaving,
} from "@/features/shelf/position";
import { useShelfStore } from "@/features/shelf/store";

interface ReadingPosition {
	/** Takes note of a relocation, to be written when the reader or the page is left. */
	record: (detail: RelocateDetail) => void;
	/** Kept so a settings-driven remount does not throw the reader back to page one. */
	lastCfi: RefObject<string | undefined>;
}

/** Remembers where a book on the shelf is being read, and writes it down. */
export function useReadingPosition(bookId: string | null): ReadingPosition {
	const lastCfi = useRef<string | undefined>(undefined);
	/** The most recent relocation, which is what gets written as the reading position. */
	const lastLocation = useRef<RelocateDetail | null>(null);
	/** The book the refs above belong to, so a change of book is seen while rendering. */
	const owner = useRef(bookId);

	// The reader stays mounted when another book is handed to it, so the position
	// of the one being left has to be let go of here, or the arriving book opens
	// at it. `lastCfi` is read while rendering, so it is dropped while rendering;
	// the relocation behind it waits for the effect below, which runs after the
	// write that needs it.
	if (owner.current !== bookId) {
		owner.current = bookId;
		lastCfi.current = undefined;
	}

	/** Writes where the reader stopped. Only books on the shelf have somewhere to write it. */
	const writeProgress = useCallback(async () => {
		const progress = progressOf(lastLocation.current);
		if (!bookId || !progress) return;
		await savePosition(bookId, progress);
	}, [bookId]);

	// Leaving the reader — the button, or anything else that changes route — is
	// one of the two moments the position is written. The shelf stayed mounted
	// underneath, so it is told to ask again rather than left marked stale.
	useEffect(
		() => () =>
			void writeProgress().then(() =>
				invalidateShelf(useShelfStore.getState().shelfId),
			),
		[writeProgress],
	);

	// Declared after that one so its cleanup runs after it: the book being left
	// is written down, and only then is its relocation dropped.
	// biome-ignore lint/correctness/useExhaustiveDependencies: a change of book is what it runs on.
	useEffect(
		() => () => {
			lastLocation.current = null;
		},
		[bookId],
	);

	// The other is the tab going away. A browser, on a phone above all, is
	// rarely closed: it is switched away from, and may be thrown out while
	// hidden, so the position is written whenever the page stops being seen.
	useEffect(() => {
		if (!bookId) return;
		const leaving = () => {
			const progress = progressOf(lastLocation.current);
			if (!progress) return;
			savePositionOnLeaving(bookId, progress);
		};
		const onHidden = () => {
			if (document.visibilityState === "hidden") leaving();
		};
		const listening = new AbortController();
		const { signal } = listening;
		document.addEventListener("visibilitychange", onHidden, { signal });
		window.addEventListener("pagehide", leaving, { signal });
		return () => listening.abort();
	}, [bookId]);

	useEffect(() => {
		if (bookId) void markOpened(bookId);
	}, [bookId]);

	const record = useCallback((detail: RelocateDetail) => {
		lastCfi.current = detail.cfi;
		lastLocation.current = detail;
	}, []);

	return { record, lastCfi };
}

/** A relocation as the position written down, once it names a place. */
function progressOf(detail: RelocateDetail | null): PositionInput | null {
	if (!detail?.cfi) return null;
	return {
		cfi: detail.cfi,
		fraction: detail.fraction ?? 0,
		label: detail.tocItem?.label ?? null,
	};
}
