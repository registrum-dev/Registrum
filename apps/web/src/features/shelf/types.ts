// One book as the screen sees it. The record's shape and the words it uses are
// the server's (packages/api), so nothing here needs a schema.

import type { BookRecord, ReadingPosition } from "@registrum/api/types";

export type {
	BookCategory,
	BookFormat,
	BookIdentifier,
	BookLayout,
	BookPage,
	BookPatch,
	BookRecord,
	BookStatus,
	FacetKind,
	Paging,
	/** Where the reader stopped, which is all of the progress the screen
	 *  decides. The timestamp is the shelf's to write, so it is not sent. */
	PositionInput,
	ScanReport,
	Shelf,
} from "@registrum/api/types";
export {
	BOOK_CATEGORIES,
	BOOK_FORMATS,
	BOOK_RATINGS,
	BOOK_STATUSES,
	FACET_KINDS,
	IDENTIFIER_SCHEMES,
	isComicFormat,
} from "@registrum/api/types";

/** A number of stars. The range is the server's: a record never carries a
 *  number of stars outside `BOOK_RATINGS`. */
export type BookRating = number;

export function progressPercent(record: {
	position: ReadingPosition | null;
}): number {
	return Math.round((record.position?.fraction ?? 0) * 100);
}

/** No books, the same array every render, for "nothing yet". */
export const NO_BOOKS: BookRecord[] = [];
