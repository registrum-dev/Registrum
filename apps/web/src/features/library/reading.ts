// What the reader writes to the library as a book is read.

import { libraryChangedQuietly } from "@/features/library/cache";
import { useLibrary } from "@/features/library/store";
import type { Position } from "@/features/library/types";
import { api } from "@/lib/api";
import { reportFailure } from "@/store/alert";

export async function markOpened(id: string): Promise<void> {
	const { shelfId } = useLibrary.getState();
	if (shelfId)
		await write(shelfId, () => api.library.markOpened.mutate({ shelfId, id }));
}

/** The timestamp is the library's to write, so it is not asked for here. */
export async function saveProgress(
	id: string,
	progress: Position,
): Promise<void> {
	const { shelfId } = useLibrary.getState();
	if (shelfId)
		await write(shelfId, () =>
			api.library.setProgress.mutate({ shelfId, id, progress }),
		);
}

/**
 * The same, for a page that is going away: sent so that the browser finishes
 * it after the tab has closed, and with nobody left to tell if it fails.
 */
export function saveProgressOnLeaving(id: string, progress: Position): void {
	const { shelfId } = useLibrary.getState();
	if (!shelfId) return;
	void fetch("/trpc/library.setProgress", {
		method: "POST",
		keepalive: true,
		credentials: "same-origin",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ shelfId, id, progress }),
	}).catch(() => undefined);
}

/** A write that the shelf does not need re-asked the moment it lands. */
async function write(
	shelfId: string,
	run: () => Promise<unknown>,
): Promise<void> {
	try {
		await run();
		libraryChangedQuietly(shelfId);
	} catch (error) {
		console.warn("Could not write to the library.", error);
		reportFailure(error, "save");
	}
}
