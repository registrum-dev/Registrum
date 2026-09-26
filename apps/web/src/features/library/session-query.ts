// Whether this browser signed in to get here: asked once, before the app is
// loaded (app/main.tsx), and kept in the cache for the settings screen.

import { queryOptions } from "@tanstack/react-query";
import { fetchSession, type Session } from "@/features/session/session";
import { queryClient } from "@/lib/query";

export const sessionQuery = queryOptions({
	queryKey: ["session"],
	queryFn: fetchSession,
	// Asked again whenever the settings open: another tab may have signed out.
	staleTime: 0,
	// `fetchSession` answers something whatever the server says.
	meta: { failure: null },
});

/** Files the answer the app was loaded on, so nothing asks it again. */
export function rememberSession(session: Session): void {
	queryClient.setQueryData(sessionQuery.queryKey, session);
}
