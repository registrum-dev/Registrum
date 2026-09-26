// The URLs the browser fetches on its own.

import type { BookRecord } from "./types";

/** The thumbnail's URL for `<img src>`. A book read again keeps its id, so the
 *  URL carries `scannedAt` to tell the new cover from the old. */
export function coverUrl(record: BookRecord): string | null {
	if (!record.cover) return null;
	return `/api/covers/${encodeURIComponent(record.id)}?v=${encodeURIComponent(record.scannedAt)}`;
}

/** Where the reader fetches a book's file from. */
export function bookFileUrl(id: string): string {
	return `/api/books/${encodeURIComponent(id)}/file`;
}
