// The rows behind a book's names. Every name belongs to one shelf, and stays
// until it is removed by hand, whether or not a book carries it.

import { createId } from "@paralleldrive/cuid2";
import type { Client, Prisma } from "@registrum/db";

import * as fold from "../util/fold";
import type { FacetKind } from "../vocabulary";
import { BATCH, chunks } from "./record";

/** The three names a book reaches through a junction, each an ordered list. */
export type NameList = "author" | "collection" | "tag";

/** A name's row, as far as the five tables agree. */
interface NameRow {
	id: string;
	name: string;
}

/** A name's row as it is first written. */
interface NewName extends NameRow {
	shelfId: string;
	nameKey: string;
}

/**
 * What the five name tables have in common. Prisma generates one delegate per
 * model, and TypeScript cannot call a union of them as one; this is the shape
 * they all accept, taken on trust in `nameTable` alone.
 */
interface NameTable {
	findMany<Row = NameRow>(args: {
		where: object;
		select: object;
	}): Promise<Row[]>;
	createMany(args: { data: NewName[] }): Promise<unknown>;
	update(args: {
		where: { id: string };
		data: { name: string; nameKey: string };
	}): Promise<unknown>;
	delete(args: { where: { id: string } }): Promise<unknown>;
	deleteMany(args: { where: object }): Promise<unknown>;
}

/** The table one kind of name is kept in. */
export function nameTable(db: Client, kind: FacetKind): NameTable {
	const tables: Record<FacetKind, unknown> = {
		author: db.author,
		collection: db.collection,
		tag: db.tag,
		publisher: db.publisher,
		series: db.series,
	};
	return tables[kind] as NameTable;
}

/** Whether a book reaches this kind of name through a junction. */
export function isNameList(kind: FacetKind): kind is NameList {
	return kind === "author" || kind === "collection" || kind === "tag";
}

/** What a book points at a name through: the junction rows of a list, or the
 *  book row itself for a publisher or a series. `book` is the column that
 *  names the book, `name` the one that names the name. */
interface Link {
	table: {
		findMany(args: {
			where: object;
			select: Record<string, true>;
		}): Promise<Record<string, string>[]>;
		createMany(args: { data: object[] }): Promise<unknown>;
		updateMany(args: { where: object; data: object }): Promise<unknown>;
		deleteMany(args: { where: object }): Promise<unknown>;
	};
	book: "bookId" | "id";
	name: string;
}

/** How books point at one kind of name. */
export function linkOf(db: Client, kind: FacetKind): Link {
	const links: Record<FacetKind, [unknown, Link["book"], string]> = {
		author: [db.bookAuthor, "bookId", "authorId"],
		collection: [db.bookCollection, "bookId", "collectionId"],
		tag: [db.bookTag, "bookId", "tagId"],
		publisher: [db.book, "id", "publisherId"],
		series: [db.book, "id", "seriesId"],
	};
	const [table, book, name] = links[kind];
	return { table: table as Link["table"], book, name };
}

/** The condition on a name's `books` that a book meeting `where` carries it. */
export function carriedBy(
	kind: FacetKind,
	where: Prisma.BookWhereInput,
): object {
	return isNameList(kind) ? { some: { book: where } } : { some: where };
}

/**
 * A name in the spelling it is written down in (`fold.name`), trimmed. A name
 * with nothing in it is no name at all, and `null` in gives `null` out -- a
 * book with no publisher.
 */
export function filled(value: string | null | undefined): string | null {
	if (value == null) return null;
	const name = fold.name(value).trim();
	return name === "" ? null : name;
}

/** The names as they will be written down: respelled, trimmed, blanks dropped,
 *  and each one only once. A name typed twice is one name, which is also what
 *  the junction's key says. */
export function uniqueNames(values: readonly string[]): string[] {
	return [...new Set(values.flatMap((value) => filled(value) ?? []))];
}

/** The rows of one kind of name on this shelf that are spelled one of these ways. */
export function rowsNamed(
	db: Client,
	shelfId: string,
	kind: FacetKind,
	names: string[],
): Promise<NameRow[]> {
	return nameTable(db, kind).findMany({
		where: { shelfId, name: { in: names } },
		select: { id: true, name: true },
	});
}

/** The row for each of these names, made where the shelf has not used one
 *  before, a batch at a time. */
export async function ensureIds(
	db: Client,
	shelfId: string,
	kind: FacetKind,
	names: readonly string[],
): Promise<Map<string, string>> {
	const found = new Map<string, string>();
	for (const batch of chunks(names, BATCH)) {
		for (const row of await rowsNamed(db, shelfId, kind, batch))
			found.set(row.name, row.id);
		const missing = batch.filter((name) => !found.has(name));
		if (missing.length === 0) continue;
		const made = missing.map((name) => ({
			id: createId(),
			shelfId,
			name,
			nameKey: fold.sortKey(name),
		}));
		await nameTable(db, kind).createMany({ data: made });
		for (const row of made) found.set(row.name, row.id);
	}
	return found;
}

/** The publisher and series rows for everything these items name, made where
 *  the shelf has none yet: one round for the whole batch. */
export async function fieldIds<T>(
	db: Client,
	shelfId: string,
	items: readonly T[],
	publisherOf: (item: T) => string | null | undefined,
	seriesOf: (item: T) => string | null | undefined,
): Promise<{ publisher: Map<string, string>; series: Map<string, string> }> {
	const named = (pick: (item: T) => string | null | undefined) => [
		...new Set(items.flatMap((item) => filled(pick(item)) ?? [])),
	];
	return {
		publisher: await ensureIds(db, shelfId, "publisher", named(publisherOf)),
		series: await ensureIds(db, shelfId, "series", named(seriesOf)),
	};
}

/** Takes one of the lists off these books. */
export async function unlinkNames(
	db: Client,
	kind: NameList,
	bookIds: readonly string[],
): Promise<void> {
	const { table } = linkOf(db, kind);
	for (const batch of chunks(bookIds, BATCH))
		await table.deleteMany({ where: { bookId: { in: batch } } });
}

/** Puts a list of its own on each of these books, in the order given: one
 *  round of name rows for the whole batch, then the junction rows in one go. */
export async function addLists(
	db: Client,
	shelfId: string,
	kind: NameList,
	lists: readonly (readonly [string, readonly string[]])[],
): Promise<void> {
	const names = uniqueNames(lists.flatMap(([, values]) => values));
	if (lists.length === 0 || names.length === 0) return;
	const ids = await ensureIds(db, shelfId, kind, names);
	const link = linkOf(db, kind);

	const rows: object[] = [];
	for (const [bookId, values] of lists) {
		uniqueNames(values).forEach((name, position) => {
			const nameId = ids.get(name);
			if (nameId) rows.push({ bookId, [link.name]: nameId, position });
		});
	}
	for (const batch of chunks(rows, BATCH))
		await link.table.createMany({ data: batch });
}
