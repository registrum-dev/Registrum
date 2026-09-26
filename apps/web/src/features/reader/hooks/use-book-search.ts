// One search of the open book.

import { useCallback, useEffect, useRef, useState } from "react";

import type { FoliateView, SearchMatch } from "@/features/reader/foliate";

/** Searching a long book yields a lot; stop once the list stops being useful. */
export const MAX_MATCHES = 300;

export interface SearchGroup {
	label: string;
	matches: SearchMatch[];
}

/** How far one search has got. */
export type SearchStatus = "idle" | "running" | "finished";

export interface BookSearch {
	query: string;
	setFilter: (query: string) => void;
	groups: SearchGroup[];
	status: SearchStatus;
	/** How much of the book has been looked through, 0 to 1. */
	progress: number;
	total: number;
	start: () => void;
	clear: () => void;
}

export function useBookSearch(view: FoliateView | null): BookSearch {
	const [query, setFilter] = useState("");
	const [groups, setGroups] = useState<SearchGroup[]>([]);
	const [status, setStatus] = useState<SearchStatus>("idle");
	const [progress, setProgress] = useState(0);

	// Bumped on every new search and on unmount, so a run in flight can bail out.
	const runId = useRef(0);

	useEffect(() => {
		return () => {
			runId.current += 1;
			view?.clearSearch();
		};
	}, [view]);

	const total = groups.reduce((sum, group) => sum + group.matches.length, 0);

	const start = useCallback(() => {
		if (!view || !query.trim()) return;

		const id = (runId.current += 1);
		view.clearSearch();
		setGroups([]);
		setProgress(0);
		setStatus("running");

		void (async () => {
			let count = 0;
			try {
				for await (const result of view.search({ query })) {
					if (id !== runId.current) return;
					if (result === "done") break;

					if ("progress" in result) {
						setProgress(result.progress);
						continue;
					}

					const group: SearchGroup =
						"subitems" in result
							? { label: result.label, matches: result.subitems }
							: { label: "", matches: [result] };

					count += group.matches.length;
					setGroups((previous) => [...previous, group]);
					if (count >= MAX_MATCHES) break;
				}
			} catch (error) {
				console.error("The search failed.", error);
			} finally {
				if (id === runId.current) setStatus("finished");
			}
		})();
	}, [view, query]);

	const clear = useCallback(() => {
		setFilter("");
		setGroups([]);
		// A run already out is not called off by emptying the box; it simply has
		// nothing to show for the moment.
		setStatus((current) => (current === "running" ? current : "idle"));
		view?.clearSearch();
	}, [view]);

	return { query, setFilter, groups, status, progress, total, start, clear };
}
