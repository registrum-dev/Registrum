import { useCallback, useSyncExternalStore } from "react";

/** One list per query, however many components ask it. */
const lists = new Map<string, MediaQueryList>();

function listOf(query: string): MediaQueryList {
	let list = lists.get(query);
	if (!list) {
		list = window.matchMedia(query);
		lists.set(query, list);
	}
	return list;
}

/** Whether the window matches a media query, as a value React can branch on. */
export function useMediaQuery(query: string): boolean {
	const subscribe = useCallback(
		(changed: () => void) => {
			const list = listOf(query);
			list.addEventListener("change", changed);
			return () => list.removeEventListener("change", changed);
		},
		[query],
	);
	return useSyncExternalStore(
		subscribe,
		() => listOf(query).matches,
		() => false,
	);
}
