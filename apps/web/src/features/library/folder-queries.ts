// What is asked about the shelves themselves, and about the folders a new one
// could be made in.

import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/lib/api";

import type { Shelf } from "./ipc";
import { useLibrary } from "./store";

/** Every shelf the server holds, and whether each one's folder is there. */
export function useShelves(enabled = true) {
	return useQuery(
		trpc.shelf.list.queryOptions(undefined, {
			enabled,
			// Asked afresh whenever a list of them is shown: another browser may
			// have made one since.
			staleTime: 0,
			meta: { failure: "loadLibrary" },
		}),
	);
}

/** The shelf this browser has open, once the list of them has come back. */
export function useCurrentShelf(): Shelf | undefined {
	const shelfId = useLibrary((state) => state.shelfId);
	return useShelves().data?.find((shelf) => shelf.id === shelfId);
}

/** The folders inside one folder, for the picker the screen draws. */
export function useFolderListing(path: string) {
	return useQuery(
		trpc.shelf.browse.queryOptions(
			{ path },
			{
				// Walked afresh each time the picker opens: the point of choosing a
				// folder is usually that it has just been made.
				gcTime: 0,
				staleTime: 0,
				// Said inside the picker rather than in the window's banner.
				meta: { failure: null },
			},
		),
	);
}
