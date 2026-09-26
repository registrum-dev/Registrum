// One book as the screen sees it. The record's shape and the words it uses are
// the server's (packages/api), so nothing here needs a schema.

import type { BookRecord, Progress } from "@Registrum/api/types";

export type {
	BookCategory,
	BookFormat,
	BookLayout,
	BookPatch,
	BookRecord,
	BookStatus,
	NameKind,
	/** Where the reader stopped, which is all of the progress the screen
	 *  decides. The timestamp is the library's to write, so it is not sent. */
	Position,
} from "@Registrum/api/types";
export {
	BOOK_CATEGORIES,
	BOOK_FORMATS,
	BOOK_RATINGS,
	BOOK_STATUSES,
	isComicFormat,
	NAME_KINDS,
} from "@Registrum/api/types";

/** A number of stars. The range is the server's: a record never carries a
 *  number of stars outside `BOOK_RATINGS`. */
export type BookRating = number;

export function progressPercent(record: { progress: Progress | null }): number {
	return Math.round((record.progress?.fraction ?? 0) * 100);
}

/** No books, the same array every render, for "nothing yet". */
export const NO_BOOKS: BookRecord[] = [];
