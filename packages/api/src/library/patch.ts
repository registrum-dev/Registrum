// The reader's changes to a book, from the edit dialog or the bulk bar.

import {
	type Client,
	type Database,
	type Prisma,
	transaction,
} from "@registrum/db";
import { z } from "zod";

import * as fold from "../lib/fold";
import { BOOK_CATEGORIES, validRating } from "../vocabulary";
import { searchText } from "./book";
import {
	addLists,
	fieldIds,
	filled,
	type NameList,
	uniqueNames,
	unlinkNames,
} from "./names";
import { BATCH, chunks, recordsFor } from "./record";

/**
 * A change the reader made. An absent field is left as it is; a field sent as
 * `null` is cleared -- except the ones a book cannot be without, where `null`
 * means the same as absent.
 */
export const bookPatchSchema = z.object({
	title: z.string().nullish(),
	subtitle: z.string().nullable().optional(),
	authors: z.array(z.string()).nullish(),
	publisher: z.string().nullable().optional(),
	published: z.string().nullable().optional(),
	identifier: z.string().nullable().optional(),
	language: z.string().nullable().optional(),
	series: z.string().nullable().optional(),
	seriesIndex: z.number().nullable().optional(),
	description: z.string().nullable().optional(),
	collections: z.array(z.string()).nullish(),
	tags: z.array(z.string()).nullish(),
	category: z.enum(BOOK_CATEGORIES).nullable().optional(),
	note: z.string().nullable().optional(),
	rating: z.number().int().nullable().optional(),
	favorite: z.boolean().nullish(),
});

export type BookPatch = z.infer<typeof bookPatchSchema>;

/** Only these fields are in the search text, so a patch that touches none of them
 *  leaves it alone -- and then the lists behind it need not be read. */
function touchesSearchText(patch: BookPatch): boolean {
	return (
		patch.title != null ||
		patch.subtitle !== undefined ||
		patch.description !== undefined ||
		patch.note !== undefined ||
		patch.publisher !== undefined ||
		patch.series !== undefined ||
		patch.authors != null ||
		patch.collections != null ||
		patch.tags != null
	);
}

function listOf(patch: BookPatch, kind: NameList): string[] | null {
	switch (kind) {
		case "author":
			return patch.authors ?? null;
		case "collection":
			return patch.collections ?? null;
		case "tag":
			return patch.tags ?? null;
	}
}

/** Writes one change to one book or to a hundred, in a single transaction. */
export async function update(
	db: Database,
	shelfId: string,
	ids: readonly string[],
	patch: BookPatch,
): Promise<void> {
	const unique = [...new Set(ids)];
	await updateEach(
		db,
		shelfId,
		unique.map((id) => [id, patch] as const),
	);
}

/** A change of its own for each book, all in a single transaction. */
export async function updateEach(
	db: Database,
	shelfId: string,
	edits: readonly (readonly [string, BookPatch])[],
): Promise<void> {
	await transaction(db, async (tx) => {
		for (const batch of chunks(edits, BATCH))
			await writeBatch(tx, shelfId, batch);
	});
}

/** A batch of books, each with its own patch. */
async function writeBatch(
	db: Client,
	shelfId: string,
	edits: readonly (readonly [string, BookPatch])[],
): Promise<void> {
	// The books as they stand now, lists and all. Read before any list below
	// is replaced: the search text of a book whose lists the patch leaves alone
	// is made from these.
	const held = new Map(
		(
			await recordsFor(
				db,
				edits.map(([id]) => id),
				shelfId,
			)
		).map((book) => [book.id, book]),
	);
	const known = edits.filter(([id]) => held.has(id));

	for (const kind of ["author", "collection", "tag"] as const) {
		const lists = known.flatMap(([id, patch]) => {
			const values = listOf(patch, kind);
			return values ? [[id, values] as const] : [];
		});
		await unlinkNames(
			db,
			kind,
			lists.map(([id]) => id),
		);
		await addLists(db, shelfId, kind, lists);
	}

	const ids = await fieldIds(
		db,
		shelfId,
		known,
		([, patch]) => patch.publisher,
		([, patch]) => patch.series,
	);

	for (const [id, patch] of known) {
		const book = held.get(id);
		if (!book) continue;
		const data: Prisma.BookUncheckedUpdateInput = {};

		const title = patch.title ?? book.title;
		const subtitle =
			patch.subtitle !== undefined ? patch.subtitle : book.subtitle;
		const description =
			patch.description !== undefined ? patch.description : book.description;
		const note = patch.note !== undefined ? patch.note : book.note;
		const publisher =
			patch.publisher !== undefined ? filled(patch.publisher) : book.publisher;
		const series =
			patch.series !== undefined ? filled(patch.series) : book.series;

		if (touchesSearchText(patch)) {
			const now = (values: string[] | null | undefined, list: string[]) =>
				values != null ? uniqueNames(values) : list;
			data.searchText = searchText(
				title,
				book.path,
				[subtitle, series, publisher, note, description],
				[
					now(patch.authors, book.authors),
					now(patch.collections, book.collections),
					now(patch.tags, book.tags),
				],
			);
		}
		if (patch.title != null) {
			data.title = title;
			data.titleKey = fold.sortKey(title);
		}
		if (patch.subtitle !== undefined) data.subtitle = subtitle;
		// An empty date is no date: the shelf sorts books with none last.
		if (patch.published !== undefined)
			data.published = patch.published?.trim() || null;
		if (patch.identifier !== undefined)
			data.identifier = patch.identifier?.trim() || null;
		if (patch.language !== undefined)
			data.language = patch.language?.trim() || null;
		if (patch.seriesIndex !== undefined) data.seriesIndex = patch.seriesIndex;
		if (patch.description !== undefined) data.description = description;
		if (patch.publisher !== undefined) {
			data.publisherId = publisher
				? (ids.publisher.get(publisher) ?? null)
				: null;
		}
		if (patch.series !== undefined)
			data.seriesId = series ? (ids.series.get(series) ?? null) : null;
		if (patch.category !== undefined) data.category = patch.category;
		if (patch.note !== undefined) data.note = note;
		// Read and written by the same rule, so a row can never hold a number of
		// stars the shelf will not draw.
		if (patch.rating !== undefined) data.rating = validRating(patch.rating);
		if (patch.favorite != null) data.favorite = patch.favorite;

		if (Object.keys(data).length === 0) continue;
		await db.book.update({ where: { id }, data });
	}
}
