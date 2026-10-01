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
import { STATUS_RANK } from "./record";

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

	const [sums] = await db.$queryRaw<
		{
			total: number;
			unread: number;
			finished: number;
			favorite: number;
			missing: number;
			noSeries: number;
			newest: string | null;
		}[]
	>`
		SELECT
			COUNT(*) AS total,
			COALESCE(SUM(status_rank = ${STATUS_RANK.unread}), 0) AS unread,
			COALESCE(SUM(status_rank = ${STATUS_RANK.finished}), 0) AS finished,
			COALESCE(SUM(favorite), 0) AS favorite,
			COALESCE(SUM(missing), 0) AS missing,
			COALESCE(SUM(series_id IS NULL), 0) AS noSeries,
			MAX(scanned_at) AS newest
		FROM book WHERE shelf_id = ${shelfId}`;
	const total = Number(sums?.total ?? 0);
	const unread = Number(sums?.unread ?? 0);
	const finished = Number(sums?.finished ?? 0);

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
		favorite: Number(sums?.favorite ?? 0),
		missing: Number(sums?.missing ?? 0),
		noSeries: Number(sums?.noSeries ?? 0),
		lastScannedAt: sums?.newest ?? null,
		authors: counted(authors),
		publishers: counted(publishers),
		collections: counted(collections),
		tags: counted(tags),
		series: await withAuthors(db, shelfId, series),
	};
}

/** Each series with the author whose name is on most of its books: the most
 *  books, then the one listed earliest, then the first by spelling. */
async function withAuthors(
	db: Client,
	shelfId: string,
	series: {
		id: string;
		name: string;
		nameKey: string;
		_count: { books: number };
	}[],
): Promise<SeriesFacet[]> {
	const tallies = await db.$queryRaw<
		{
			seriesId: string;
			name: string;
			nameKey: string;
			count: number;
			first: number;
		}[]
	>`
		SELECT b.series_id AS seriesId, a.name AS name, a.name_key AS nameKey,
			COUNT(*) AS count, MIN(l.position) AS first
		FROM book_author l
		JOIN book b ON b.id = l.book_id
		JOIN author a ON a.id = l.author_id
		WHERE b.shelf_id = ${shelfId} AND b.series_id IS NOT NULL
		GROUP BY b.series_id, a.id`;

	const leaders = new Map<string, (typeof tallies)[number]>();
	for (const row of tallies) {
		const held = leaders.get(row.seriesId);
		if (
			!held ||
			(Number(row.count) - Number(held.count) ||
				Number(held.first) - Number(row.first) ||
				compare(held.nameKey, row.nameKey)) > 0
		)
			leaders.set(row.seriesId, row);
	}

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
		author: leaders.get(each.id)?.name ?? null,
	}));
}
