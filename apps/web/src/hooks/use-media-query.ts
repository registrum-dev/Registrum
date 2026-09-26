import { useCallback, useSyncExternalStore } from "react";

/** Whether the window matches a media query, as a value React can branch on. */
export function useMediaQuery(query: string): boolean {
	const subscribe = useCallback(
		(changed: () => void) => {
			const list = window.matchMedia(query);
			list.addEventListener("change", changed);
			return () => list.removeEventListener("change", changed);
		},
		[query],
	);
	return useSyncExternalStore(
		subscribe,
		() => window.matchMedia(query).matches,
		() => false,
	);
}
