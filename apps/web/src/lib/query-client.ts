// The one cache every answer is kept in.

import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { isUnreachable } from "@/lib/reachability";
import { asFailure, reportFailure, type Wording } from "@/store/alert";

declare module "@tanstack/react-query" {
	interface Register {
		/** How a failed question is reported; `null` when it draws its own
		 *  answer on screen and a banner would only say it twice. */
		queryMeta: { failure: Wording | null };
		mutationMeta: { failure: Wording };
	}
}

/** The one cache every answer the shelf gives is kept in. */
export const queryClient = new QueryClient({
	// Every question and write names the wording to fall back on; the banner is
	// raised here rather than in each screen.
	queryCache: new QueryCache({
		onError: (error, query) => {
			const attempt = query.meta?.failure;
			// Without a server, the shelf shows what was saved here instead.
			if (attempt && !isUnreachable(error)) reportFailure(error, attempt);
		},
	}),
	mutationCache: new MutationCache({
		onError: (error, _variables, _context, mutation) => {
			// Stopping a generation is something the reader did, not something
			// that went wrong.
			if (asFailure(error)?.code === "aiStopped") return;
			reportFailure(error, mutation.meta?.failure ?? "save");
		},
	}),
	defaultOptions: {
		queries: {
			// Nothing changes behind this app's back; every write says what it made
			// stale (`invalidateShelf`).
			staleTime: Number.POSITIVE_INFINITY,
			// A failed command is a failure to report, not a flake to ride out.
			retry: false,
			refetchOnWindowFocus: false,
		},
		mutations: { retry: false },
	},
});
