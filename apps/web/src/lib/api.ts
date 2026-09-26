// The one client every call to the server goes through.

import type { AppRouter } from "@registrum/api/routers/index";
import {
	createTRPCClient,
	httpBatchLink,
	httpLink,
	httpSubscriptionLink,
	splitLink,
} from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { queryClient } from "@/lib/query-client";

const URL = "/trpc";

/** A browser signed out underneath -- the server restarted, or its password
 *  changed -- starts over at the sign-in. */
async function signedIn(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	const response = await fetch(input, { ...init, credentials: "same-origin" });
	if (response.status === 401) location.reload();
	return response;
}

/**
 * Questions are batched; writes go one request each, because a scan or a
 * generation can keep its request open for minutes and must not hold up the
 * shelf behind it. What the server says as it goes arrives over SSE.
 */
export const api = createTRPCClient<AppRouter>({
	links: [
		splitLink({
			condition: (op) => op.type === "subscription",
			true: httpSubscriptionLink({ url: URL }),
			false: splitLink({
				condition: (op) => op.type === "mutation",
				true: httpLink({ url: URL, fetch: signedIn }),
				false: httpBatchLink({ url: URL, fetch: signedIn }),
			}),
		}),
	],
});

/**
 * The same client as TanStack Query options: `trpc.x.y.queryOptions(input)`,
 * `mutationOptions()` and `queryKey()`, over the one cache. Needs no provider.
 */
export const trpc = createTRPCOptionsProxy<AppRouter>({
	client: api,
	queryClient,
});
