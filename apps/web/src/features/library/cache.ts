// Which cached answers belong to a library, how a write is laid over them, and
// who says they are stale. The keys themselves are tRPC's
// (`trpc.library.books.queryKey()` and so on).

import type { Query, QueryFilters } from "@tanstack/react-query";
import { trpc } from "@/lib/api";
import { queryClient } from "@/lib/query";
import type { BookPage } from "./ipc";
import type { BookRecord } from "./types";

/**
 * The keys the answers not asked through tRPC are filed under -- a book's cast
 * and map, its chapters (features/ai). Everything under `shelf` is stale when
 * the library changes.
 */
export const libraryKeys = {
	/** Everything of one library that is not a tRPC answer. */
	shelf: (shelfId: string) => ["library", shelfId] as const,
	/** What this book's cast and map are, as stored — not a generation. */
	ai: (shelfId: string, id: string) => ["library", shelfId, "ai", id] as const,
	/** The chapters a question may be asked about, read out of the book itself. */
	chapters: (shelfId: string, id: string) =>
		["library", shelfId, "chapters", id] as const,
};

/** Whether a tRPC answer was asked about this shelf. */
function onShelf(shelfId: string) {
	return (query: Query) => {
		const opts = query.queryKey[1] as
			| { input?: { shelfId?: unknown } }
			| undefined;
		return opts?.input?.shelfId === shelfId;
	};
}

/** Every answer about one library: its books, counts and path rules, and what
 *  is filed under `libraryKeys.shelf`. */
function aboutShelf(shelfId: string): QueryFilters[] {
	return [
		trpc.library.pathFilter({ predicate: onShelf(shelfId) }),
		trpc.rule.pathFilter({ predicate: onShelf(shelfId) }),
		{ queryKey: libraryKeys.shelf(shelfId) },
	];
}

/**
 * Lays a change over every copy of the shelf's books the cache is holding:
 * every page the library answered (a hook's `select` never reaches the cache,
 * so the change works on `page.books` and the count follows it), and every book
 * asked for by id. A change that answers null takes the book off the pages; a
 * book asked for by id keeps what it had.
 */
export function overBooks(
	shelfId: string,
	change: (book: BookRecord) => BookRecord | null,
): void {
	queryClient.setQueriesData<BookPage>(
		trpc.library.books.queryFilter({ shelfId }),
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
		trpc.library.book.queryFilter({ shelfId }),
		(book) => (book ? (change(book) ?? book) : book),
	);
}

/** What the cache holds of the shelf's books now, and the way to put it back. */
export function snapshotBooks(shelfId: string): () => void {
	const before = [
		...queryClient.getQueriesData(trpc.library.books.queryFilter({ shelfId })),
		...queryClient.getQueriesData(trpc.library.book.queryFilter({ shelfId })),
	];
	return () => {
		for (const [key, data] of before) queryClient.setQueryData(key, data);
	};
}

/**
 * Says that a write has landed, so everything this library answered is out of
 * date and whatever is on screen should ask again.
 */
export function libraryChanged(shelfId: string | null): Promise<void> {
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
export function libraryChangedQuietly(shelfId: string | null): void {
	if (!shelfId) return;
	for (const filters of aboutShelf(shelfId)) {
		void queryClient.invalidateQueries({ ...filters, refetchType: "none" });
	}
}
