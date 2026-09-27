// Telling a server that is not there from one that answered no.

import { TRPCClientError } from "@trpc/client";

/** What each browser's `fetch` says when the request never got an answer. */
const NO_ANSWER = /failed to fetch|load failed|networkerror/i;

/** Whether this failure is the server not being reached at all. */
export function isUnreachable(error: unknown): boolean {
	if (!navigator.onLine) return true;
	let current: unknown = error;
	for (let depth = 0; depth < 4 && current instanceof Error; depth += 1) {
		if (current instanceof TypeError && NO_ANSWER.test(current.message)) {
			return true;
		}
		current = current.cause;
	}
	// A proxy in front of a server that is down answers, but not as tRPC would.
	return error instanceof TRPCClientError && !error.data && !error.shape;
}
