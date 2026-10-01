// Every question a shelf is asked; mutations.ts writes, folder-queries.ts asks
// about the shelves themselves.

import {
	hashKey,
	keepPreviousData,
	type UseQueryResult,
	useQueries,
	useQuery,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { trpc } from "@/lib/api";

import type { SortKey } from "./columns";
import {
	type BookFilter,
	type FilterField,
	mergeFilter,
	NO_FACETS,
	type ShelfFacets,
} from "./filter";
import { useShelfStore } from "./store";
import type { BookPage, BookRecord, FacetKind } from "./types";

/** What a question that could not be asked says, unless it draws its own answer. */
const ASKS_THE_SHELF = { failure: "loadShelf" } as const;

/**
 * The shelf every question below is about, and whether it may be asked yet.
 * "Not yet" is said once, here: the id is the empty string until there is one,
 * and `asking` is what holds every question back until it means something.
 */
export function useShelfId(): { shelfId: string; asking: boolean } {
	const shelfId = useShelfStore((state) => state.shelfId);
	const opened = useShelfStore((state) => state.opened);
	return { shelfId: shelfId ?? "", asking: shelfId !== null && opened };
}

/**
 * The shelf: one page of the books the conditions are letting through, in the
 * order chosen, and how many of them there are in all. Only a page turn keeps
 * the last answer up while the next one comes.
 */
export function useShelfBooks() {
	const { shelfId, asking } = useShelfId();
	const filter = useShelfStore((state) => state.filter);
	const sort = useShelfStore((state) => state.sort);
	const order = useShelfStore((state) => state.order);
	const page = useShelfStore((state) => state.page);
	const size = useShelfStore((state) => state.pageSize);
	const asked = hashKey([shelfId, filter, sort, order]);

	return useQuery(
		trpc.book.list.queryOptions(
			{ shelfId, filter, sort, order, paging: { page, size } },
			{
				enabled: asking,
				meta: ASKS_THE_SHELF,
				placeholderData: (previous, previousQuery) => {
					const was = previousQuery?.queryKey[1]?.input as
						| { shelfId: string; filter: unknown; sort: string; order: string }
						| undefined;
					return was &&
						hashKey([was.shelfId, was.filter, was.sort, was.order]) === asked
						? previous
						: undefined;
				},
			},
		),
	);
}

/** What the shelf holds, counted over the whole of it. */
export function useFacetsQuery() {
	const { shelfId, asking } = useShelfId();

	return useQuery(
		trpc.book.facets.queryOptions(
			{ shelfId },
			{
				enabled: asking,
				meta: ASKS_THE_SHELF,
				placeholderData: keepPreviousData,
			},
		),
	);
}

/** Every name of one kind on the shelf, the ones no book carries included,
 *  most-used first. */
export function useNames(kind: FacetKind) {
	const { shelfId, asking } = useShelfId();

	return useQuery(
		trpc.book.names.queryOptions(
			{ shelfId, kind },
			{
				enabled: asking,
				meta: ASKS_THE_SHELF,
				placeholderData: keepPreviousData,
			},
		),
	);
}

/** The counts themselves, for the many places that only draw them. */
export function useFacets(): ShelfFacets {
	return useFacetsQuery().data ?? NO_FACETS;
}

/** Kept outside the hook: a new `select` each render is run each render. */
const toSet = (values: string[]) => new Set(values);

/**
 * The values of one list some book still carries under the rest of the
 * question. The list's own values are left out of the question here too, so
 * choosing one more of them is not a new question.
 */
export function useFilterOptions(field: FilterField | null) {
	const { shelfId, asking } = useShelfId();
	const filter = useShelfStore((state) => state.filter);
	const rest = field ? mergeFilter(filter, { [field]: undefined }) : filter;

	return useQuery(
		trpc.book.filterOptions.queryOptions(
			{ shelfId, filter: rest, field: field ?? "author" },
			{
				enabled: asking && field !== null,
				meta: ASKS_THE_SHELF,
				select: toSet,
			},
		),
	);
}

/**
 * Goes over to the shelf a book is on. A link to a book can be opened in a
 * browser that is looking at another shelf, or at none, and the book is only
 * ever asked for on its own shelf.
 */
export function useSwitchToBookShelf(id: string | undefined) {
	const hydrated = useShelfStore((state) => state.hydrated);
	const { data: found, isFetchedAfterMount } = useQuery(
		trpc.book.shelfOf.queryOptions(
			{ id: id ?? "" },
			{
				enabled: Boolean(id) && hydrated,
				// Asked again each time a link names the book: it may have moved.
				staleTime: 0,
				// Not finding it is the book's own screen to say.
				meta: { failure: null },
			},
		),
	);

	useEffect(() => {
		// Only the server's answer to this link moves the shelf, not one kept
		// from an earlier visit.
		if (!id || !found || !isFetchedAfterMount) return;
		const { shelfId, switchTo } = useShelfStore.getState();
		if (found !== shelfId) void switchTo(found);
	}, [id, found, isFetchedAfterMount]);
}

/** One book, whether or not the shelf is showing it. */
export function useBook(id: string | undefined) {
	const { shelfId, asking } = useShelfId();
	const book = id ?? "";

	return useQuery(
		trpc.book.get.queryOptions(
			{ shelfId, id: book },
			{ enabled: asking && book !== "", meta: ASKS_THE_SHELF },
		),
	);
}

/** How many of a name's books are asked for at a time. */
export const FACET_PAGE = 100;

interface FacetBooks {
	books: BookRecord[];
	/** How many books carry the name; undefined until the first page is in. */
	total: number | undefined;
	isPending: boolean;
	/** A page past the first is still on its way. */
	isFetchingMore: boolean;
}

/** The pages, as one list. A write between two answers can move a book from
 *  one page to the next, so it is listed once. */
function joinPages(
	results: Pick<UseQueryResult<BookPage, unknown>, "data" | "isPending">[],
): FacetBooks {
	const seen = new Set<string>();
	const books: BookRecord[] = [];
	for (const result of results) {
		for (const book of result.data?.books ?? []) {
			if (seen.has(book.id)) continue;
			seen.add(book.id);
			books.push(book);
		}
	}
	return {
		books,
		total: results[0]?.data?.total,
		isPending: results[0]?.isPending ?? true,
		isFetchingMore: results.slice(1).some((result) => result.isPending),
	};
}

/**
 * The first `pages` pages of the books filed under one of the shelf's names.
 * Each page is a page of the shelf's own question, so a write is laid over it
 * and makes it stale the same way.
 */
export function useFacetBooks(kind: FacetKind, name: string, pages = 1) {
	const { shelfId, asking } = useShelfId();
	// A kind of name is spelled the same as the condition that asks for it
	// (`FacetFieldContract`), so the question is the shelf's own question.
	const filter = { [kind]: [name] } as BookFilter;
	// A set is read in volume order; every other name is read by title.
	const sort: SortKey = kind === "series" ? "seriesIndex" : "title";

	return useQueries({
		queries: Array.from({ length: pages }, (_, page) =>
			trpc.book.list.queryOptions(
				{
					shelfId,
					filter,
					sort,
					order: "asc",
					paging: { page, size: FACET_PAGE },
				},
				{ enabled: asking && name !== "", meta: ASKS_THE_SHELF },
			),
		),
		combine: joinPages,
	});
}

/** The rest of the set, when there is one: the first page of the series' own
 *  sheet, so the two share one answer. */
export function useSeriesVolumes(series: string | null) {
	return useFacetBooks("series", series ?? "").books;
}
