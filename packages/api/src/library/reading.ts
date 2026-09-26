// Where the reader is in a book, and whether it has been opened.

import { type Database, transaction } from "@Registrum/db";
import { z } from "zod";

import { now } from "../lib/time";
import { BATCH, chunks, clampFraction } from "./record";

/** Where the reader stopped, as the reader screen reports it. */
export const positionSchema = z.object({
	cfi: z.string(),
	fraction: z.number().nullish(),
	label: z.string().nullish(),
});

export type Position = z.infer<typeof positionSchema>;

/** Only a book on this shelf is written to. */
async function onShelf(
	db: Database,
	shelfId: string,
	id: string,
): Promise<boolean> {
	return (await db.book.count({ where: { id, shelfId } })) > 0;
}

export async function setProgress(
	db: Database,
	shelfId: string,
	id: string,
	position: Position,
) {
	if (!(await onShelf(db, shelfId, id))) return;
	const state = {
		cfi: position.cfi,
		fraction: clampFraction(position.fraction ?? 0),
		label: position.label ?? null,
		updatedAt: now(),
	};
	await db.readingState.upsert({
		where: { bookId: id },
		create: { bookId: id, ...state },
		update: state,
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
export async function clearReading(
	db: Database,
	shelfId: string,
	ids: readonly string[],
): Promise<void> {
	await transaction(db, async (tx) => {
		for (const batch of chunks(ids, BATCH)) {
			const onShelf = { shelfId, id: { in: batch } };
			await tx.readingState.deleteMany({ where: { book: onShelf } });
			await tx.book.updateMany({
				where: onShelf,
				data: { lastOpenedAt: null },
			});
		}
	});
}
