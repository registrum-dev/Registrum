// Finding one book, forgetting some, and the haystack the search box looks in.

import { type Client, type Database, transaction } from "@Registrum/db";

import * as fold from "../lib/fold";
import { sweep } from "./names";
import {
	BATCH,
	type BookRecord,
	chunks,
	findRecords,
	recordsFor,
} from "./record";

export async function findOne(
	db: Client,
	shelfId: string,
	id: string,
): Promise<BookRecord | null> {
	return (await findRecords(db, { where: { id, shelfId } }))[0] ?? null;
}

/** Drops everything the library remembers about these books. The files
 *  themselves are never touched; the caller deletes the thumbnails. */
export async function forget(
	db: Database,
	shelfId: string,
	ids: readonly string[],
): Promise<void> {
	await transaction(db, async (tx) => {
		for (const batch of chunks(ids, BATCH)) {
			await tx.book.deleteMany({ where: { shelfId, id: { in: batch } } });
		}
		await sweep(tx, shelfId);
	});
}

/** The fields a book is searched by besides its title, path and lists, in the
 *  order they go into the haystack. */
export type SearchFields = [
	subtitle: string | null,
	series: string | null,
	publisher: string | null,
	note: string | null,
	description: string | null,
];

/** The haystack the search box looks in, folded the way the needle will be. */
export function searchText(
	title: string,
	path: string,
	fields: SearchFields,
	lists: [readonly string[], readonly string[], readonly string[]],
): string {
	const parts: string[] = [title, path];
	for (const field of fields) if (field != null) parts.push(field);
	for (const list of lists) parts.push(...list);
	return fold.fold(parts.join("\n"));
}

/** The haystack of a record as it stands. */
export function searchTextOf(book: BookRecord): string {
	return searchText(
		book.title,
		book.path,
		[book.subtitle, book.series, book.publisher, book.note, book.description],
		[book.authors, book.collections, book.tags],
	);
}

/** Rewrites the haystack for these books from what the library now holds. The
 *  names in it are copies, so a name that changed elsewhere leaves them stale. */
export async function refreshSearch(
	db: Client,
	ids: readonly string[],
): Promise<void> {
	for (const book of await recordsFor(db, ids)) {
		await db.book.update({
			where: { id: book.id },
			data: { searchText: searchTextOf(book) },
		});
	}
}
