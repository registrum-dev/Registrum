// A book's identifiers, written as a list the way its other lists are.

import type { Client } from "@registrum/db";

import type { BookIdentifier } from "../util/identifier";
import { BATCH, chunks } from "./record";

/** Replaces the identifiers of each book given with the list given for it. */
export async function writeIdentifiers(
	db: Client,
	lists: readonly (readonly [string, readonly BookIdentifier[]])[],
): Promise<void> {
	for (const batch of chunks(lists, BATCH)) {
		await db.bookIdentifier.deleteMany({
			where: { bookId: { in: batch.map(([id]) => id) } },
		});
		const rows = batch.flatMap(([bookId, list]) =>
			list.map((each, position) => ({ bookId, ...each, position })),
		);
		if (rows.length) await db.bookIdentifier.createMany({ data: rows });
	}
}
