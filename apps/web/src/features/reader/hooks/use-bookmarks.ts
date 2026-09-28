// The bookmarks of the book being read, and the one on the page shown.

import type { Bookmark } from "@registrum/api/types";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	addBookmark,
	bookmarksQuery,
	removeBookmark,
} from "@/features/reader/bookmarks";
import type { CfiModule, RelocateDetail } from "@/features/reader/foliate";
import { loadCfi } from "@/features/reader/foliate-loader";
import { randomId } from "@/lib/random-id";

interface Bookmarks {
	/** Only a book on the shelf has somewhere to keep them. */
	enabled: boolean;
	marks: Bookmark[];
	/** Whether a mark falls on the page shown. */
	marked: boolean;
	/** Marks the page shown, or takes its marks away. */
	toggle: () => void;
	remove: (id: string) => void;
}

export function useBookmarks(
	shelfId: string | null,
	bookId: string | null,
	relocation: RelocateDetail | null,
): Bookmarks {
	const enabled = Boolean(shelfId && bookId);
	const marks =
		useQuery({
			...bookmarksQuery(shelfId ?? "", bookId ?? ""),
			enabled,
		}).data ?? [];

	const [cfi, setCfi] = useState<CfiModule | null>(null);
	useEffect(() => {
		void loadCfi().then(setCfi);
	}, []);

	const page = relocation?.cfi;
	const onPage = useMemo(
		() =>
			cfi && page ? marks.filter((mark) => isOnPage(cfi, page, mark.cfi)) : [],
		[cfi, page, marks],
	);

	const toggle = useCallback(() => {
		if (!shelfId || !bookId || !cfi || !page || !relocation) return;
		if (onPage.length > 0) {
			for (const mark of onPage) void removeBookmark(shelfId, bookId, mark.id);
			return;
		}
		void addBookmark(shelfId, bookId, {
			id: randomId(),
			cfi: cfi.collapse(page),
			fraction: relocation.fraction ?? 0,
			label: relocation.tocItem?.label ?? null,
			createdAt: new Date().toISOString(),
		});
	}, [shelfId, bookId, cfi, page, relocation, onPage]);

	const remove = useCallback(
		(id: string) => {
			if (shelfId && bookId) void removeBookmark(shelfId, bookId, id);
		},
		[shelfId, bookId],
	);

	return { enabled, marks, marked: onPage.length > 0, toggle, remove };
}

/** A page's CFI is the range it shows, except on a fixed-layout page, where it
 *  is the page itself. The end is left out, since it is where the next page
 *  starts. */
function isOnPage(cfi: CfiModule, page: string, mark: string): boolean {
	try {
		const start = cfi.collapse(page);
		const end = cfi.collapse(page, true);
		const at = cfi.collapse(mark);
		if (start === end) return cfi.compare(at, start) === 0;
		return cfi.compare(start, at) <= 0 && cfi.compare(at, end) < 0;
	} catch {
		return false;
	}
}
