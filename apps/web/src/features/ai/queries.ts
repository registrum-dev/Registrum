// What a book already carries, kept beside every other answer about that
// library.

import { useQuery } from "@tanstack/react-query";

import { libraryKeys } from "@/features/library/cache";
import { api, trpc } from "@/lib/api";
import { queryClient } from "@/lib/query";

import { type BookAi, type Character, type Graph, isConfigured } from "./types";

/** The endpoint and model the server asks, and whether it holds a key. */
export function useAiSettings() {
	return useQuery(
		trpc.ai.settings.queryOptions(undefined, {
			meta: { failure: "loadLibrary" },
		}),
	);
}

/** Whether generations can be asked for at all. False until the server says. */
export function useAiReady(): boolean {
	const settings = useAiSettings().data;
	return settings ? isConfigured(settings) : false;
}

// The two below are filed under the library's own keys rather than tRPC's:
// a write to the library (`libraryChanged`) is what makes them stale -- a book
// edited, or read further along.

/** The cast and the map this book already carries. */
export function useBookAi(shelfId: string, id: string, offered: boolean) {
	return useQuery({
		queryKey: libraryKeys.ai(shelfId, id),
		queryFn: () => api.ai.bookAi.query({ shelfId, id }),
		enabled: offered,
		meta: { failure: "loadLibrary" },
	});
}

/**
 * The chapters this book can be asked about. Reading them means reading the
 * book, so `at` — where the reader is right now — is left out of the key: it
 * decides the ticks the first time the picker is built, and turning a page is
 * not a reason to read the file again.
 */
export function useBookChapters(
	shelfId: string,
	id: string,
	at: number | null,
	offered: boolean,
) {
	return useQuery({
		queryKey: libraryKeys.chapters(shelfId, id),
		// The options are taken afresh every render, so this is always the `at`
		// of the moment the question goes.
		queryFn: () => api.ai.chapters.query({ shelfId, id, at }),
		enabled: offered,
		meta: { failure: "readBook" },
	});
}

/** Puts a finished generation where the screen reads it from. */
export function rememberCast(
	shelfId: string,
	id: string,
	characters: Character[],
): void {
	queryClient.setQueryData<BookAi>(libraryKeys.ai(shelfId, id), {
		characters,
		graph: null,
	});
}

export function rememberGraph(shelfId: string, id: string, graph: Graph): void {
	queryClient.setQueryData<BookAi>(libraryKeys.ai(shelfId, id), (stored) => ({
		characters: stored?.characters ?? null,
		graph,
	}));
}
