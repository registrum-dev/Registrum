// Where the reader stopped, and the moments it is written.

import type { Position } from "@Registrum/api/types";
import { type RefObject, useCallback, useEffect, useRef } from "react";

import { libraryChanged } from "@/features/library/cache";
import {
	markOpened,
	saveProgress,
	saveProgressOnLeaving,
} from "@/features/library/reading";
import { useLibrary } from "@/features/library/store";
import type { RelocateDetail } from "@/features/reader/foliate";

/** Longest a reading position may go unwritten while the book is open. */
const AUTOSAVE_MS = 60_000;

interface ReadingPosition {
	/** Takes note of a relocation, and writes it if the last write has aged out. */
	record: (detail: RelocateDetail) => void;
	/** Kept so a settings-driven remount does not throw the reader back to page one. */
	lastCfi: RefObject<string | undefined>;
}

/** Remembers where a library book is being read, and writes it down. */
export function useReadingPosition(bookId: string | null): ReadingPosition {
	const lastCfi = useRef<string | undefined>(undefined);
	/** The most recent relocation, which is what gets written as the reading position. */
	const lastLocation = useRef<RelocateDetail | null>(null);
	const savedAt = useRef(Date.now());
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

	/** Writes where the reader stopped. Only library books have somewhere to write it. */
	const writeProgress = useCallback(async () => {
		const progress = progressOf(lastLocation.current);
		if (!bookId || !progress) return;
		savedAt.current = Date.now();
		await saveProgress(bookId, progress);
	}, [bookId]);

	// Leaving the reader — the button, or anything else that changes route — is
	// one of the two moments the position is written. The shelf stayed mounted
	// underneath, so it is told to ask again rather than left marked stale.
	useEffect(
		() => () =>
			void writeProgress().then(() =>
				libraryChanged(useLibrary.getState().shelfId),
			),
		[writeProgress],
	);

	// Declared after that one so its cleanup runs after it: the book being left
	// is written down, and only then is its relocation dropped.
	useEffect(
		() => () => {
			lastLocation.current = null;
			savedAt.current = Date.now();
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
			savedAt.current = Date.now();
			saveProgressOnLeaving(bookId, progress);
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

	const record = useCallback(
		(detail: RelocateDetail) => {
			lastCfi.current = detail.cfi;
			lastLocation.current = detail;
			if (Date.now() - savedAt.current > AUTOSAVE_MS) void writeProgress();
		},
		[writeProgress],
	);

	return { record, lastCfi };
}

/** A relocation as the position written down, once it names a place. */
function progressOf(detail: RelocateDetail | null): Position | null {
	if (!detail?.cfi) return null;
	return {
		cfi: detail.cfi,
		fraction: detail.fraction ?? 0,
		label: detail.tocItem?.label ?? null,
	};
}
