// The shelf as a wall of covers.

import type { SortKey, SortOrder } from "@/features/shelf/columns";
import type { BookRecord } from "@/features/shelf/types";
import { BookCard } from "./book-card";

/** The shelf the rail is standing in front of, one cover per book. */
export function ShelfGrid({
	books,
	sort,
	order,
	page,
	onOpenDetail,
	onOpenReader,
}: {
	books: BookRecord[];
	sort: SortKey;
	order: SortOrder;
	page: number;
	onOpenDetail: (book: BookRecord) => void;
	onOpenReader: (book: BookRecord) => void;
}) {
	return (
		// Covers shrink on a phone rather than the shelf becoming a single
		// column: two or three to a row is still a shelf.
		<div
			// Keyed on the order and the page, so a re-sort or a page turn deals
			// the shelf out again and a condition does not.
			key={`${sort}:${order}:${page}`}
			className="grid grid-cols-[repeat(auto-fill,minmax(164px,1fr))] phone:grid-cols-[repeat(auto-fill,minmax(126px,1fr))] gap-x-5 phone:gap-x-3 gap-y-4 phone:gap-y-3"
		>
			{books.map((book, index) => (
				<BookCard
					key={book.id}
					book={book}
					at={index}
					onOpen={() => onOpenDetail(book)}
					// A book whose file has gone missing is opened the same way:
					// the reader is where "it is not there" gets said.
					onRead={() => onOpenReader(book)}
				/>
			))}
		</div>
	);
}
