// What the shelf is asked for: its conditions, its order and its pages.

import type { Client, Prisma } from "@Registrum/db";
import { z } from "zod";

import * as fold from "../lib/fold";
import { compare } from "../lib/text";
import {
	BOOK_CATEGORIES,
	BOOK_FORMATS,
	BOOK_STATUSES,
	type BookStatus,
	NONE,
} from "../vocabulary";
import { carriedBy, nameTable } from "./names";
import { type BookRecord, findRecords, STATUS_WHERE, statusOf } from "./record";

/**
 * The conditions the shelf is asked for. A field that is absent is not a
 * condition -- which is not the same as a condition matching nothing. A list is
 * met by a book that carries any one of its values; an empty list is the same
 * as an absent one.
 */
export const libraryQuerySchema = z.object({
	q: z.string().nullish(),
	status: z.enum(BOOK_STATUSES).nullish(),
	category: z.array(z.enum(BOOK_CATEGORIES)).optional(),
	/** Either a number of stars or the word for "unrated", which is not zero stars. */
	rating: z.array(z.union([z.number().int(), z.string()])).optional(),
	favorite: z.boolean().nullish(),
	author: z.array(z.string()).optional(),
	publisher: z.array(z.string()).optional(),
	series: z.array(z.string()).optional(),
	collection: z.array(z.string()).optional(),
	tag: z.array(z.string()).optional(),
	format: z.array(z.enum(BOOK_FORMATS)).optional(),
	missing: z.boolean().nullish(),
});

export type LibraryQuery = z.infer<typeof libraryQuerySchema>;

export const LIST_FIELDS = [
	"author",
	"publisher",
	"series",
	"collection",
	"tag",
	"category",
	"rating",
	"format",
] as const;
/** The conditions that are a list of values, each of which the filter offers as
 *  a list of its own. */
export type ListField = (typeof LIST_FIELDS)[number];

export const SORT_KEYS = [
	"title",
	"author",
	"series",
	"seriesIndex",
	"collection",
	"tag",
	"publisher",
	"published",
	"category",
	"format",
	"status",
	"favorite",
	"rating",
	"progress",
	"lastOpened",
	"added",
	"size",
	"path",
] as const;
/** What the shelf is ordered by. A column the table can show is a key here. */
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const pagingSchema = z.object({
	/** Counted from zero. */
	page: z.number().int().min(0),
	size: z.number().int().min(1).max(1000),
});
/** Which slice of the shelf is wanted. No paging is the whole of it. */
export type Paging = z.infer<typeof pagingSchema>;

/** One page of the shelf, and how many books the conditions let through. */
export interface BookPage {
	books: BookRecord[];
	total: number;
}

/** The conditions, as the `where` of a book query. */
export async function whereOf(
	db: Client,
	shelfId: string,
	query: LibraryQuery,
): Promise<Prisma.BookWhereInput> {
	const all: Prisma.BookWhereInput[] = [{ shelfId }];

	// Space-separated terms, each of which must appear somewhere in the book.
	const terms = query.q ? fold.fold(query.q).split(/\s+/).filter(Boolean) : [];
	for (const term of terms) all.push({ searchText: { contains: term } });
	// On SQLite `contains` reads `%` and `_` as wildcards, and the reader is
	// typing a title, not a pattern: a term holding either is checked again
	// here, against the haystack itself.
	if (terms.some((term) => /[%_]/.test(term))) {
		const candidates = await db.book.findMany({
			where: { AND: [...all] },
			select: { id: true, searchText: true },
		});
		const kept = candidates.filter((book) =>
			terms.every((term) => book.searchText.includes(term)),
		);
		all.push({ id: { in: kept.map((book) => book.id) } });
	}

	// Derived from the reading position rather than stored.
	if (query.status) all.push(STATUS_WHERE[query.status]);

	if (query.category?.length) all.push({ category: { in: query.category } });
	if (query.format?.length) all.push({ format: { in: query.format } });
	if (query.favorite === true) all.push({ favorite: true });
	if (query.missing != null) all.push({ missing: query.missing });
	if (query.rating?.length) {
		const stars = query.rating.filter(
			(value): value is number => typeof value === "number",
		);
		const any: Prisma.BookWhereInput[] = [];
		if (stars.length) any.push({ rating: { in: stars } });
		// Unrated is `null`, which is not the same as one star.
		if (query.rating.some((value) => typeof value === "string"))
			any.push({ rating: null });
		all.push({ OR: any });
	}

	if (query.publisher?.length)
		all.push({ publisher: { is: { name: { in: query.publisher } } } });
	if (query.series?.length) {
		const named = query.series.filter((name) => name !== NONE);
		const any: Prisma.BookWhereInput[] = [];
		if (named.length) any.push({ series: { is: { name: { in: named } } } });
		if (query.series.includes(NONE)) any.push({ seriesId: null });
		all.push({ OR: any });
	}

	if (query.author?.length)
		all.push({ authors: { some: { author: { name: { in: query.author } } } } });
	if (query.collection?.length) {
		all.push({
			collections: { some: { collection: { name: { in: query.collection } } } },
		});
	}
	if (query.tag?.length)
		all.push({ tags: { some: { tag: { name: { in: query.tag } } } } });

	return { AND: all };
}

/** The keys a book's own row sorts on, which the database orders directly.
 *  A book with nothing there goes last whichever way round the column is
 *  read: a book with no series is not the first volume of anything. */
interface ColumnOrder {
	column: keyof Prisma.BookOrderByWithRelationInput;
	nullable: boolean;
}

const COLUMN_ORDER: Partial<Record<SortKey, ColumnOrder>> = {
	title: { column: "titleKey", nullable: false },
	seriesIndex: { column: "seriesIndex", nullable: true },
	published: { column: "published", nullable: true },
	category: { column: "category", nullable: true },
	format: { column: "format", nullable: false },
	favorite: { column: "favorite", nullable: false },
	rating: { column: "rating", nullable: true },
	lastOpened: { column: "lastOpenedAt", nullable: true },
	added: { column: "addedAt", nullable: false },
	size: { column: "size", nullable: false },
	path: { column: "path", nullable: false },
};

/** The shelf's own tiebreak: newest, then title. */
const TIEBREAK: Prisma.BookOrderByWithRelationInput[] = [
	{ addedAt: "desc" },
	{ titleKey: "asc" },
];

function columnOrder(
	{ column, nullable }: ColumnOrder,
	order: SortOrder,
): Prisma.BookOrderByWithRelationInput[] {
	return [
		{ [column]: nullable ? { sort: order, nulls: "last" } : order },
		...TIEBREAK,
	];
}

/** The order the shelf sorts in by path, ascending. */
export const PATH_ORDER = columnOrder(
	{ column: "path", nullable: false },
	"asc",
);

/** The same order as `PATH_ORDER`, for records already read. The columns are
 *  compared the way SQLite compares text by default: byte by byte in UTF-8.
 *  `titleKey` is not on a record, and is always the title's `fold.sortKey`. */
export function comparePathOrder(a: BookRecord, b: BookRecord): number {
	const bytes = (x: string, y: string) =>
		Buffer.compare(Buffer.from(x), Buffer.from(y));
	return (
		bytes(a.path, b.path) ||
		bytes(b.addedAt, a.addedAt) ||
		bytes(fold.sortKey(a.title), fold.sortKey(b.title))
	);
}

/** What a book sorts on for the keys that lie outside its row -- the first
 *  name of a list, a name it points at, its reading position -- read for every
 *  book the conditions let through and ordered here. */
const OUTSIDE_SELECT = {
	id: true,
	addedAt: true,
	titleKey: true,
	publisher: { select: { nameKey: true } },
	series: { select: { nameKey: true } },
	readingState: { select: { fraction: true } },
	authors: {
		orderBy: { position: "asc" },
		take: 1,
		select: { author: { select: { nameKey: true } } },
	},
	collections: {
		orderBy: { position: "asc" },
		take: 1,
		select: { collection: { select: { nameKey: true } } },
	},
	tags: {
		orderBy: { position: "asc" },
		take: 1,
		select: { tag: { select: { nameKey: true } } },
	},
} satisfies Prisma.BookSelect;

type Outside = Prisma.BookGetPayload<{ select: typeof OUTSIDE_SELECT }>;

function outsideValue(book: Outside, sort: SortKey): string | number | null {
	switch (sort) {
		case "author":
			return book.authors[0]?.author.nameKey ?? null;
		case "collection":
			return book.collections[0]?.collection.nameKey ?? null;
		case "tag":
			return book.tags[0]?.tag.nameKey ?? null;
		case "series":
			return book.series?.nameKey ?? null;
		case "publisher":
			return book.publisher?.nameKey ?? null;
		case "progress":
			return book.readingState?.fraction ?? null;
		case "status":
			return STATUS_RANK[statusOf(book.readingState)];
		default:
			return null;
	}
}

/** Reading first, then unread, then done -- the order the shelf is used in. */
const STATUS_RANK: Record<BookStatus, number> = {
	reading: 0,
	unread: 1,
	finished: 2,
};

/** The ids of every book the conditions let through, in order. */
async function orderedOutside(
	db: Client,
	where: Prisma.BookWhereInput,
	sort: SortKey,
	order: SortOrder,
): Promise<string[]> {
	const books = await db.book.findMany({ where, select: OUTSIDE_SELECT });
	const flip = order === "desc" ? -1 : 1;
	return books
		.map((book) => ({ book, value: outsideValue(book, sort) }))
		.sort((x, y) => {
			const xEmpty = x.value === null || x.value === "";
			const yEmpty = y.value === null || y.value === "";
			if (xEmpty !== yEmpty) return xEmpty ? 1 : -1;
			if (!xEmpty && !yEmpty) {
				const by =
					compare(x.value as string | number, y.value as string | number) *
					flip;
				if (by !== 0) return by;
			}
			return (
				compare(y.book.addedAt, x.book.addedAt) ||
				compare(x.book.titleKey, y.book.titleKey)
			);
		})
		.map(({ book }) => book.id);
}

/** One page of the books on the shelf, in the order the shelf is sorted by. */
export async function books(
	db: Client,
	shelfId: string,
	query: LibraryQuery,
	sort: SortKey,
	order: SortOrder,
	paging: Paging | null,
): Promise<BookPage> {
	const where = await whereOf(db, shelfId, query);
	const column = COLUMN_ORDER[sort];

	if (column) {
		const found = await findRecords(db, {
			where,
			orderBy: columnOrder(column, order),
			...(paging ? { skip: paging.page * paging.size, take: paging.size } : {}),
		});
		const total = paging ? await db.book.count({ where }) : found.length;
		return { books: found, total };
	}

	const ids = await orderedOutside(db, where, sort, order);
	const wanted = paging
		? ids.slice(paging.page * paging.size, (paging.page + 1) * paging.size)
		: ids;
	const found = await findRecords(db, { where: { id: { in: wanted } } });
	const byId = new Map(found.map((book) => [book.id, book]));
	return {
		books: wanted.flatMap((id) => byId.get(id) ?? []),
		total: ids.length,
	};
}

/** The same question with one of its lists taken off. */
function without(query: LibraryQuery, field: ListField): LibraryQuery {
	return { ...query, [field]: undefined };
}

/** The values of one list that some book would still carry if that list were
 *  taken off the question. */
export async function reach(
	db: Client,
	shelfId: string,
	query: LibraryQuery,
	field: ListField,
): Promise<string[]> {
	const where = await whereOf(db, shelfId, without(query, field));

	switch (field) {
		case "author":
		case "collection":
		case "tag":
		case "publisher":
		case "series": {
			const found = (
				await nameTable(db, field).findMany({
					where: { shelfId, books: carriedBy(field, where) },
					select: { id: true, name: true },
				})
			).map((row) => row.name);
			if (field !== "series") return found;
			const loose = await db.book.count({
				where: { AND: [where, { seriesId: null }] },
			});
			return loose > 0 ? [...found, NONE] : found;
		}
		case "category": {
			const rows = await db.book.groupBy({
				by: ["category"],
				where: { AND: [where, { category: { not: null } }] },
			});
			return rows.flatMap((row) => row.category ?? []);
		}
		case "format":
			return (await db.book.groupBy({ by: ["format"], where })).map(
				(row) => row.format,
			);
		case "rating":
			return (await db.book.groupBy({ by: ["rating"], where })).map((row) =>
				row.rating === null ? NONE : String(row.rating),
			);
	}
}
