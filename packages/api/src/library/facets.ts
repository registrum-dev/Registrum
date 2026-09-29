// What a shelf holds, counted for the filter.

import type { Client } from "@registrum/db";

import { compare } from "../util/text";
import {
	BOOK_CATEGORIES,
	BOOK_FORMATS,
	type BookCategory,
	type BookFormat,
	type BookStatus,
	type FacetKind,
	NONE,
} from "../vocabulary";
import { nameTable } from "./names";
import { STATUS_WHERE } from "./record";

export interface FacetEntry {
	name: string;
	count: number;
}

/** A series, and the author whose name is on most of its books: series of the
 *  same name are told apart by who wrote them. */
export interface SeriesFacet {
	name: string;
	count: number;
	author: string | null;
}

export interface ShelfFacets {
	total: number;
	statuses: Partial<Record<BookStatus, number>>;
	categories: Partial<Record<BookCategory, number>>;
	formats: Partial<Record<BookFormat, number>>;
	/** Keyed by the value the query carries: `"1"`..`"5"` and `__none__`. */
	ratings: Record<string, number>;
	favorite: number;
	missing: number;
	authors: FacetEntry[];
	publishers: FacetEntry[];
	series: SeriesFacet[];
	collections: FacetEntry[];
	tags: FacetEntry[];
	noSeries: number;
	/** The newest record is the last time a scan read anything. */
	lastScannedAt: string | null;
}

/** Every key present, whether or not the shelf has one. A count of zero is an
 *  answer; a missing key is a question. */
function filledIn<K extends string>(
	keys: readonly K[],
	counted: Map<string, number>,
): Record<K, number> {
	return Object.fromEntries(
		keys.map((key) => [key, counted.get(key) ?? 0]),
	) as Record<K, number>;
}

/** Most-used first, then in the order of the folded spelling. */
function byUse<T extends { count: number; nameKey: string }>(rows: T[]): T[] {
	return rows.sort(
		(a, b) => b.count - a.count || compare(a.nameKey, b.nameKey),
	);
}

/** One kind of name, each with how many books carry it. */
function counted(
	rows: { name: string; nameKey: string; _count: { books: number } }[],
): FacetEntry[] {
	return byUse(
		rows
			.filter((row) => row._count.books > 0)
			.map((row) => ({
				name: row.name,
				nameKey: row.nameKey,
				count: row._count.books,
			})),
	).map(({ name, count }) => ({ name, count }));
}

/** Every name of one kind the shelf holds, the ones no book carries included. */
export async function names(
	db: Client,
	shelfId: string,
	kind: FacetKind,
): Promise<FacetEntry[]> {
	const rows = await nameTable(db, kind).findMany<{
		name: string;
		nameKey: string;
		_count: { books: number };
	}>({
		where: { shelfId },
		select: { name: true, nameKey: true, _count: { select: { books: true } } },
	});
	return byUse(
		rows.map((row) => ({
			name: row.name,
			nameKey: row.nameKey,
			count: row._count.books,
		})),
	).map(({ name, count }) => ({ name, count }));
}

/** What the shelf holds, counted. */
export async function facets(
	db: Client,
	shelfId: string,
): Promise<ShelfFacets> {
	const shelf = { shelfId };
	const countSelect = {
		name: true,
		nameKey: true,
		_count: { select: { books: true } },
	} as const;

	const [total, unread, finished, favorite, missing, noSeries, newest] =
		await Promise.all([
			db.book.count({ where: shelf }),
			db.book.count({ where: { ...shelf, ...STATUS_WHERE.unread } }),
			db.book.count({ where: { ...shelf, ...STATUS_WHERE.finished } }),
			db.book.count({ where: { ...shelf, favorite: true } }),
			db.book.count({ where: { ...shelf, missing: true } }),
			db.book.count({ where: { ...shelf, seriesId: null } }),
			db.book.aggregate({ where: shelf, _max: { scannedAt: true } }),
		]);

	const [categories, formats, ratings] = await Promise.all([
		db.book.groupBy({
			by: ["category"],
			where: { ...shelf, category: { not: null } },
			_count: { _all: true },
		}),
		db.book.groupBy({ by: ["format"], where: shelf, _count: { _all: true } }),
		db.book.groupBy({ by: ["rating"], where: shelf, _count: { _all: true } }),
	]);

	const [authors, publishers, collections, tags, series] = await Promise.all([
		db.author.findMany({ where: shelf, select: countSelect }),
		db.publisher.findMany({ where: shelf, select: countSelect }),
		db.collection.findMany({ where: shelf, select: countSelect }),
		db.tag.findMany({ where: shelf, select: countSelect }),
		db.series.findMany({ where: shelf, select: { id: true, ...countSelect } }),
	]);

	return {
		total,
		statuses: { unread, reading: total - unread - finished, finished },
		categories: filledIn(
			BOOK_CATEGORIES,
			new Map(categories.map((row) => [row.category ?? "", row._count._all])),
		),
		formats: filledIn(
			BOOK_FORMATS,
			new Map(formats.map((row) => [row.format, row._count._all])),
		),
		ratings: filledIn(
			["1", "2", "3", "4", "5", NONE],
			new Map(
				ratings.map((row) => [
					row.rating === null ? NONE : String(row.rating),
					row._count._all,
				]),
			),
		),
		favorite,
		missing,
		noSeries,
		lastScannedAt: newest._max.scannedAt,
		authors: counted(authors),
		publishers: counted(publishers),
		collections: counted(collections),
		tags: counted(tags),
		series: await withAuthors(db, series),
	};
}

/** Each series with the author whose name is on most of its books: the most
 *  books, then the one listed earliest, then the first by spelling. */
async function withAuthors(
	db: Client,
	series: {
		id: string;
		name: string;
		nameKey: string;
		_count: { books: number };
	}[],
): Promise<SeriesFacet[]> {
	const listed = await db.bookAuthor.findMany({
		where: { book: { seriesId: { in: series.map((each) => each.id) } } },
		select: {
			position: true,
			book: { select: { seriesId: true } },
			author: { select: { id: true, name: true, nameKey: true } },
		},
	});

	const tallies = new Map<
		string,
		Map<string, { name: string; nameKey: string; count: number; first: number }>
	>();
	for (const row of listed) {
		const seriesId = row.book.seriesId;
		if (!seriesId) continue;
		const tally = tallies.get(seriesId) ?? new Map();
		tallies.set(seriesId, tally);
		const held = tally.get(row.author.id);
		if (held) {
			held.count += 1;
			held.first = Math.min(held.first, row.position);
		} else {
			tally.set(row.author.id, {
				name: row.author.name,
				nameKey: row.author.nameKey,
				count: 1,
				first: row.position,
			});
		}
	}
	const leader = (seriesId: string) =>
		[...(tallies.get(seriesId)?.values() ?? [])].sort(
			(a, b) =>
				b.count - a.count || a.first - b.first || compare(a.nameKey, b.nameKey),
		)[0]?.name ?? null;

	return byUse(
		series
			.filter((each) => each._count.books > 0)
			.map((each) => ({
				id: each.id,
				name: each.name,
				nameKey: each.nameKey,
				count: each._count.books,
			})),
	).map((each) => ({
		name: each.name,
		count: each.count,
		author: leader(each.id),
	}));
}
