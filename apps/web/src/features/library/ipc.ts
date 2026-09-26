// What the library needs of the server beyond its questions and writes, which
// go through `trpc` (lib/api.ts): the run's progress, and the URLs the browser
// fetches on its own.

import type { ScanProgress } from "@Registrum/api/types";

import { api } from "@/lib/api";

import type { BookRecord } from "./types";

export type {
	BookPage,
	Paging,
	ScanReport,
	Shelf,
} from "@Registrum/api/types";

/** How far the run on this shelf has got. Resolves once the server is
 *  listening, so that nothing said after the run starts is missed. */
export function onScanProgress(
	shelfId: string,
	heard: (progress: ScanProgress) => void,
): Promise<() => void> {
	return new Promise((resolve) => {
		let settled = false;
		const listening = api.library.scanProgress.subscribe(
			{ shelfId },
			{
				onStarted: () => {
					settled = true;
					resolve(() => listening.unsubscribe());
				},
				onData: heard,
				onError: () => {
					if (!settled) resolve(() => listening.unsubscribe());
				},
			},
		);
	});
}

/** The thumbnail's URL for `<img src>`. A book read again keeps its id, so the
 *  URL carries `indexedAt` to tell the new cover from the old. */
export function coverUrl(record: BookRecord): string | null {
	if (!record.cover) return null;
	return `/api/covers/${encodeURIComponent(record.id)}?v=${encodeURIComponent(record.indexedAt)}`;
}

/** Where the reader fetches a book's file from. */
export function bookFileUrl(id: string): string {
	return `/api/books/${encodeURIComponent(id)}/file`;
}
