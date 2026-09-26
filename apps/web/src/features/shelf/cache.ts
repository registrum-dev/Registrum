// Which cached answers belong to a shelf, how a write is laid over them, and
// who says they are stale. The keys themselves are tRPC's
// (`trpc.book.list.queryKey()` and so on).

import type { Query, QueryFilters } from "@tanstack/react-query";
import { trpc } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import type { BookPage, BookRecord } from "./types";

/**
 * The keys the answers not asked through tRPC are filed under -- a book's characters
 * and map, its chapters (features/ai). Everything under `shelf` is stale when
 * the shelf changes.
 */
export const shelfKeys = {
	/** Everything of one shelf that is not a tRPC answer. */
	shelf: (shelfId: string) => ["shelf", shelfId] as const,
	/** What this book's characters and map are, as stored — not a generation. */
	ai: (shelfId: string, id: string) => ["shelf", shelfId, "ai", id] as const,
	/** The chapters a question may be asked about, read out of the book itself. */
	chapters: (shelfId: string, id: string) =>
		["shelf", shelfId, "chapters", id] as const,
};

/** Whether a tRPC answer was asked about this shelf. */
function isOnShelf(shelfId: string) {
	return (query: Query) => {
		const opts = query.queryKey[1] as
			| { input?: { shelfId?: unknown } }
			| undefined;
		return opts?.input?.shelfId === shelfId;
	};
}

/** Every answer about one shelf: its books, counts and path rules, and what
 *  is filed under `shelfKeys.shelf`. */
function aboutShelf(shelfId: string): QueryFilters[] {
	return [
		trpc.book.pathFilter({ predicate: isOnShelf(shelfId) }),
		trpc.rule.pathFilter({ predicate: isOnShelf(shelfId) }),
		{ queryKey: shelfKeys.shelf(shelfId) },
	];
}

/**
 * Lays a change over every copy of the shelf's books the cache is holding:
 * every page the shelf answered (a hook's `select` never reaches the cache,
 * so the change works on `page.books` and the count follows it), and every book
 * asked for by id. A change that answers null takes the book off the pages; a
 * book asked for by id keeps what it had.
 */
export function overBooks(
	shelfId: string,
	change: (book: BookRecord) => BookRecord | null,
): void {
	queryClient.setQueriesData<BookPage>(
		trpc.book.list.queryFilter({ shelfId }),
		(page) => {
			if (!page) return page;
			const books = page.books.flatMap((book) => {
				const next = change(book);
				return next ? [next] : [];
			});
			return {
				...page,
				books,
				total: page.total - (page.books.length - books.length),
			};
		},
	);
	queryClient.setQueriesData<BookRecord | null>(
		trpc.book.get.queryFilter({ shelfId }),
		(book) => (book ? (change(book) ?? book) : book),
	);
}

/** What the cache holds of the shelf's books now, and the way to put it back. */
export function snapshotBooks(shelfId: string): () => void {
	const before = [
		...queryClient.getQueriesData(trpc.book.list.queryFilter({ shelfId })),
		...queryClient.getQueriesData(trpc.book.get.queryFilter({ shelfId })),
	];
	return () => {
		for (const [key, data] of before) queryClient.setQueryData(key, data);
	};
}

/**
 * Says that a write has landed, so everything this shelf answered is out of
 * date and whatever is on screen should ask again.
 */
export function invalidateShelf(shelfId: string | null): Promise<void> {
	if (!shelfId) return Promise.resolve();
	return (
		Promise.all(
			aboutShelf(shelfId).map((filters) =>
				queryClient.invalidateQueries(filters),
			),
		)
			.then(() => undefined)
			// A question that could not be re-asked says so itself; the write did not fail.
			.catch(() => undefined)
	);
}

/** The same, for a write made where nobody is looking. */
export function markShelfStale(shelfId: string | null): void {
	if (!shelfId) return;
	for (const filters of aboutShelf(shelfId)) {
		void queryClient.invalidateQueries({ ...filters, refetchType: "none" });
	}
}
