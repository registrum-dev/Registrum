// What a book already carries, kept beside every other answer about that
// shelf.

import { useQuery } from "@tanstack/react-query";

import { shelfKeys } from "@/features/shelf/cache";
import { api, trpc } from "@/lib/api";
import { queryClient } from "@/lib/query-client";

import {
	type Character,
	isAiConfigured,
	type Relation,
	type SavedAi,
} from "./types";

/** The endpoint and model the server asks, and whether it holds a key. */
export function useAiSettings() {
	return useQuery(
		trpc.ai.settings.queryOptions(undefined, {
			meta: { failure: "loadShelf" },
		}),
	);
}

/** Whether generations can be asked for at all. False until the server says. */
export function useAiConfigured(): boolean {
	const settings = useAiSettings().data;
	return settings ? isAiConfigured(settings) : false;
}

// The two below are filed under the shelf's own keys rather than tRPC's:
// a write to the shelf (`invalidateShelf`) is what makes them stale -- a book
// edited, or read further along.

/** The characters and the map this book already carries. */
export function useSavedAi(shelfId: string, id: string, offered: boolean) {
	return useQuery({
		queryKey: shelfKeys.ai(shelfId, id),
		queryFn: () => api.ai.saved.query({ shelfId, id }),
		enabled: offered,
		meta: { failure: "loadShelf" },
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
		queryKey: shelfKeys.chapters(shelfId, id),
		// The options are taken afresh every render, so this is always the `at`
		// of the moment the question goes.
		queryFn: () => api.ai.chapters.query({ shelfId, id, at }),
		enabled: offered,
		meta: { failure: "readBook" },
	});
}

/** Puts a finished generation where the screen reads it from. */
export function rememberCharacters(
	shelfId: string,
	id: string,
	characters: Character[],
): void {
	queryClient.setQueryData<SavedAi>(shelfKeys.ai(shelfId, id), {
		characters,
		relations: null,
	});
}

export function rememberRelations(
	shelfId: string,
	id: string,
	relations: Relation[],
): void {
	queryClient.setQueryData<SavedAi>(shelfKeys.ai(shelfId, id), (stored) => ({
		characters: stored?.characters ?? null,
		relations,
	}));
}
