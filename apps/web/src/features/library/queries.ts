// Every question a shelf is asked; mutations.ts writes, folder-queries.ts asks
// about the shelves themselves.

import { hashKey, keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { trpc } from "@/lib/api";

import type { SortKey } from "./columns";
import {
	type LibraryFacets,
	type LibraryQuery,
	type ListField,
	mergeQuery,
	NO_FACETS,
} from "./query";
import { useLibrary } from "./store";
import type { NameKind } from "./types";

/** What a question that could not be asked says, unless it draws its own answer. */
const ASKS_THE_LIBRARY = { failure: "loadLibrary" } as const;

/**
 * The shelf every question below is about, and whether it may be asked yet.
 * "Not yet" is said once, here: the id is the empty string until there is one,
 * and `asking` is what holds every question back until it means something.
 */
export function useShelfId(): { shelfId: string; asking: boolean } {
	const shelfId = useLibrary((state) => state.shelfId);
	const opened = useLibrary((state) => state.opened);
	return { shelfId: shelfId ?? "", asking: shelfId !== null && opened };
}

/**
 * The shelf: one page of the books the conditions are letting through, in the
 * order chosen, and how many of them there are in all. Only a page turn keeps
 * the last answer up while the next one comes.
 */
export function useShelf() {
	const { shelfId, asking } = useShelfId();
	const query = useLibrary((state) => state.query);
	const sort = useLibrary((state) => state.sort);
	const order = useLibrary((state) => state.order);
	const page = useLibrary((state) => state.page);
	const size = useLibrary((state) => state.pageSize);
	const asked = hashKey([shelfId, query, sort, order]);

	return useQuery(
		trpc.library.books.queryOptions(
			{ shelfId, query, sort, order, paging: { page, size } },
			{
				enabled: asking,
				meta: ASKS_THE_LIBRARY,
				placeholderData: (previous, previousQuery) => {
					const was = previousQuery?.queryKey[1]?.input as
						| { shelfId: string; query: unknown; sort: string; order: string }
						| undefined;
					return was &&
						hashKey([was.shelfId, was.query, was.sort, was.order]) === asked
						? previous
						: undefined;
				},
			},
		),
	);
}

/** What the library holds, counted over the whole of it. */
export function useFacetsQuery() {
	const { shelfId, asking } = useShelfId();

	return useQuery(
		trpc.library.facets.queryOptions(
			{ shelfId },
			{
				enabled: asking,
				meta: ASKS_THE_LIBRARY,
				placeholderData: keepPreviousData,
			},
		),
	);
}

/** The counts themselves, for the many places that only draw them. */
export function useFacets(): LibraryFacets {
	return useFacetsQuery().data ?? NO_FACETS;
}

/**
 * The values of one list some book still carries under the rest of the
 * question. The list's own values are left out of the question here too, so
 * choosing one more of them is not a new question.
 */
export function useReach(field: ListField | null) {
	const { shelfId, asking } = useShelfId();
	const query = useLibrary((state) => state.query);
	const rest = field ? mergeQuery(query, { [field]: undefined }) : query;

	return useQuery(
		trpc.library.reach.queryOptions(
			{ shelfId, query: rest, field: field ?? "author" },
			{
				enabled: asking && field !== null,
				meta: ASKS_THE_LIBRARY,
				select: (values) => new Set(values),
			},
		),
	);
}

/**
 * Goes over to the shelf a book is on. A link to a book can be opened in a
 * browser that is looking at another shelf, or at none, and the book is only
 * ever asked for on its own shelf.
 */
export function useFollowBook(id: string | undefined) {
	const hydrated = useLibrary((state) => state.hydrated);
	const { data: found, isFetchedAfterMount } = useQuery(
		trpc.library.shelfOf.queryOptions(
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
		const { shelfId, switchTo } = useLibrary.getState();
		if (found !== shelfId) void switchTo(found);
	}, [id, found, isFetchedAfterMount]);
}

/** One book, whether or not the shelf is showing it. */
export function useBook(id: string | undefined) {
	const { shelfId, asking } = useShelfId();
	const book = id ?? "";

	return useQuery(
		trpc.library.book.queryOptions(
			{ shelfId, id: book },
			{ enabled: asking && book !== "", meta: ASKS_THE_LIBRARY },
		),
	);
}

/** The books filed under one of the library's names. */
export function useBooksUnder(kind: NameKind, name: string) {
	const { shelfId, asking } = useShelfId();
	// A kind of name is spelled the same as the condition that asks for it
	// (`NameFieldContract`), so the question is the shelf's own question.
	const query = { [kind]: [name] } as LibraryQuery;
	// A set is read in volume order; every other name is read by title.
	const sort: SortKey = kind === "series" ? "seriesIndex" : "title";

	return useQuery(
		trpc.library.books.queryOptions(
			{ shelfId, query, sort, order: "asc", paging: null },
			{
				enabled: asking && name !== "",
				meta: ASKS_THE_LIBRARY,
				select: (page) => page.books,
			},
		),
	);
}

/** The rest of the set, when there is one: the same question as the series'
 *  own sheet, so the two share one answer. */
export function useSeriesVolumes(series: string | null) {
	return useBooksUnder("series", series ?? "");
}
