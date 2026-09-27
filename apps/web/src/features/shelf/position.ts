// What the reader writes to the shelf as a book is read.

import {
	dropPosition,
	keepPosition,
} from "@/features/offline/pending-positions";
import { markShelfStale } from "@/features/shelf/cache";
import { useShelfStore } from "@/features/shelf/store";
import type { PositionInput } from "@/features/shelf/types";
import { api } from "@/lib/api";
import { isUnreachable } from "@/lib/reachability";
import { reportFailure } from "@/store/alert";

export async function markOpened(id: string): Promise<void> {
	const { shelfId } = useShelfStore.getState();
	if (shelfId)
		await write(shelfId, () => api.book.markOpened.mutate({ shelfId, id }));
}

/** The timestamp is the shelf's to write, so it is not asked for here. Kept
 *  in this browser too, until the server is known to have it. */
export async function savePosition(
	id: string,
	position: PositionInput,
): Promise<void> {
	const { shelfId } = useShelfStore.getState();
	if (!shelfId) return;
	const kept = keepPosition(shelfId, id, position);
	await write(shelfId, async () => {
		await api.book.setPosition.mutate({ shelfId, id, position });
		dropPosition(id, kept);
	});
}

/**
 * The same, for a page that is going away: sent so that the browser finishes
 * it after the tab has closed, and with nobody left to tell if it fails.
 */
export function savePositionOnLeaving(
	id: string,
	position: PositionInput,
): void {
	const { shelfId } = useShelfStore.getState();
	if (!shelfId) return;
	// Whether this lands is never heard, so it stays kept until the next
	// `sendPositions` sees the server has it.
	keepPosition(shelfId, id, position);
	void fetch("/trpc/book.setPosition", {
		method: "POST",
		keepalive: true,
		credentials: "same-origin",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ shelfId, id, position }),
	}).catch(() => undefined);
}

/** A write that the shelf does not need re-asked the moment it lands. */
async function write(
	shelfId: string,
	run: () => Promise<unknown>,
): Promise<void> {
	try {
		await run();
		markShelfStale(shelfId);
	} catch (error) {
		// Without the server, the position waits in this browser.
		if (isUnreachable(error)) return;
		console.warn("Could not write to the shelf.", error);
		reportFailure(error, "save");
	}
}
