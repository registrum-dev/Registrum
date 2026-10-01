// Where the reader is in a book, and whether it has been opened.

import { type Database, transaction } from "@registrum/db";
import { z } from "zod";

import { now } from "../util/time";
import { BATCH, chunks, clampFraction, STATUS_RANK, statusOf } from "./record";

/** Where the reader stopped, as the reader screen reports it. */
export const positionSchema = z.object({
	cfi: z.string(),
	fraction: z.number().nullish(),
	label: z.string().nullish(),
});

export type PositionInput = z.infer<typeof positionSchema>;

/** Only a book on this shelf is written to. */
async function isOnShelf(
	db: Database,
	shelfId: string,
	id: string,
): Promise<boolean> {
	return (await db.book.count({ where: { id, shelfId } })) > 0;
}

export async function setPosition(
	db: Database,
	shelfId: string,
	id: string,
	position: PositionInput,
) {
	if (!(await isOnShelf(db, shelfId, id))) return;
	const state = {
		cfi: position.cfi,
		fraction: clampFraction(position.fraction ?? 0),
		label: position.label ?? null,
		updatedAt: now(),
	};
	await transaction(db, async (tx) => {
		await tx.readingPosition.upsert({
			where: { bookId: id },
			create: { bookId: id, ...state },
			update: state,
		});
		await tx.book.update({
			where: { id },
			data: {
				progress: state.fraction,
				statusRank: STATUS_RANK[statusOf(state)],
			},
		});
	});
}

export async function markOpened(
	db: Database,
	shelfId: string,
	id: string,
): Promise<void> {
	await db.book.updateMany({
		where: { id, shelfId },
		data: { lastOpenedAt: now() },
	});
}

/** Puts these books back to never having been opened: the reading position
 *  goes, and with it the status, and so does when they were last opened. */
export async function clearPosition(
	db: Database,
	shelfId: string,
	ids: readonly string[],
): Promise<void> {
	await transaction(db, async (tx) => {
		for (const batch of chunks(ids, BATCH)) {
			const onShelf = { shelfId, id: { in: batch } };
			await tx.readingPosition.deleteMany({ where: { book: onShelf } });
			await tx.book.updateMany({
				where: onShelf,
				data: {
					lastOpenedAt: null,
					progress: null,
					statusRank: STATUS_RANK.unread,
				},
			});
		}
	});
}
