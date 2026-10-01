// What the shelf is asked for: its filter, its order and its pages.

import type { Client, Prisma } from "@registrum/db";
import { z } from "zod";

import * as fold from "../util/fold";
import {
	BOOK_CATEGORIES,
	BOOK_FORMATS,
	BOOK_STATUSES,
	type FacetKind,
	NONE,
} from "../vocabulary";
import { searchable } from "./book";
import { nameTable } from "./names";
import { type BookRecord, recordsFor, STATUS_WHERE } from "./record";

/**
 * The conditions the shelf is asked for. A field that is absent is not a
 * condition -- which is not the same as a condition matching nothing. A list is
 * met by a book that carries any one of its values; an empty list is the same
 * as an absent one.
 */
export const bookFilterSchema = z.object({
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

export type BookFilter = z.infer<typeof bookFilterSchema>;

export const FILTER_FIELDS = [
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
export type FilterField = (typeof FILTER_FIELDS)[number];

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
export function whereOf(
	shelfId: string,
	filter: BookFilter,
): Prisma.BookWhereInput {
	const all: Prisma.BookWhereInput[] = [{ shelfId }];

	// Space-separated terms, each of which must appear somewhere in the book.
	const terms = filter.q
		? searchable(filter.q).split(/\s+/).filter(Boolean)
		: [];
	for (const term of terms) all.push({ searchText: { contains: term } });

	// Derived from the reading position rather than stored.
	if (filter.status) all.push(STATUS_WHERE[filter.status]);

	if (filter.category?.length) all.push({ category: { in: filter.category } });
	if (filter.format?.length) all.push({ format: { in: filter.format } });
	if (filter.favorite === true) all.push({ favorite: true });
	if (filter.missing != null) all.push({ missing: filter.missing });
	if (filter.rating?.length) {
		const stars = filter.rating.filter(
			(value): value is number => typeof value === "number",
		);
		const any: Prisma.BookWhereInput[] = [];
		if (stars.length) any.push({ rating: { in: stars } });
		// Unrated is `null`, which is not the same as one star.
		if (filter.rating.some((value) => typeof value === "string"))
			any.push({ rating: null });
		all.push({ OR: any });
	}

	if (filter.publisher?.length)
		all.push({ publisher: { is: { name: { in: filter.publisher } } } });
	if (filter.series?.length) {
		const named = filter.series.filter((name) => name !== NONE);
		const any: Prisma.BookWhereInput[] = [];
		if (named.length) any.push({ series: { is: { name: { in: named } } } });
		if (filter.series.includes(NONE)) any.push({ seriesId: null });
		all.push({ OR: any });
	}

	if (filter.author?.length)
		all.push({
			authors: { some: { author: { name: { in: filter.author } } } },
		});
	if (filter.collection?.length) {
		all.push({
			collections: {
				some: { collection: { name: { in: filter.collection } } },
			},
		});
	}
	if (filter.tag?.length)
		all.push({ tags: { some: { tag: { name: { in: filter.tag } } } } });

	return { AND: all };
}

/** The column each key sorts on. A book with nothing there goes last whichever
 *  way round the column is read: a book with no series is not the first
 *  volume of anything. */
interface ColumnOrder {
	column: keyof Prisma.BookOrderByWithRelationInput;
	nullable: boolean;
}

const COLUMN_ORDER: Record<SortKey, ColumnOrder> = {
	title: { column: "titleKey", nullable: false },
	author: { column: "authorKey", nullable: true },
	series: { column: "seriesKey", nullable: true },
	seriesIndex: { column: "seriesIndex", nullable: true },
	collection: { column: "collectionKey", nullable: true },
	tag: { column: "tagKey", nullable: true },
	publisher: { column: "publisherKey", nullable: true },
	published: { column: "published", nullable: true },
	category: { column: "category", nullable: true },
	format: { column: "format", nullable: false },
	status: { column: "statusRank", nullable: false },
	favorite: { column: "favorite", nullable: false },
	rating: { column: "rating", nullable: true },
	progress: { column: "progress", nullable: true },
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
export const PATH_ORDER = columnOrder(COLUMN_ORDER.path, "asc");

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

/** One page of the books on the shelf, in the order the shelf is sorted by. */
export async function listBooks(
	db: Client,
	shelfId: string,
	filter: BookFilter,
	sort: SortKey,
	order: SortOrder,
	paging: Paging | null,
): Promise<BookPage> {
	const where = whereOf(shelfId, filter);
	// The order is read first, as ids alone: a record's lists cannot be read
	// for more than a batch of books at once.
	const ids = (
		await db.book.findMany({
			where,
			orderBy: columnOrder(COLUMN_ORDER[sort], order),
			select: { id: true },
			...(paging ? { skip: paging.page * paging.size, take: paging.size } : {}),
		})
	).map((row) => row.id);
	const byId = new Map(
		(await recordsFor(db, ids)).map((book) => [book.id, book]),
	);
	const total = paging ? await db.book.count({ where }) : ids.length;
	return { books: ids.flatMap((id) => byId.get(id) ?? []), total };
}

/** The same question with one of its lists taken off. */
function without(filter: BookFilter, field: FilterField): BookFilter {
	return { ...filter, [field]: undefined };
}

/** The values of one list that some book would still carry if that list were
 *  taken off the question. */
export async function filterOptions(
	db: Client,
	shelfId: string,
	filter: BookFilter,
	field: FilterField,
): Promise<string[]> {
	const where = whereOf(shelfId, without(filter, field));

	switch (field) {
		case "author":
		case "collection":
		case "tag":
		case "publisher":
		case "series": {
			const carried = await carriedIds(db, field, where);
			const found = (
				await nameTable(db, field).findMany({
					where: { id: { in: carried.filter((id) => id !== null) } },
					select: { id: true, name: true },
				})
			).map((row) => row.name);
			return field === "series" && carried.includes(null)
				? [...found, NONE]
				: found;
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

/** The ids of the names of one kind that the books meeting `where` carry,
 *  counted from the books' side; `null` for a book with no publisher or series. */
async function carriedIds(
	db: Client,
	kind: FacetKind,
	where: Prisma.BookWhereInput,
): Promise<(string | null)[]> {
	switch (kind) {
		case "author":
			return (
				await db.bookAuthor.groupBy({
					by: ["authorId"],
					where: { book: where },
				})
			).map((row) => row.authorId);
		case "collection":
			return (
				await db.bookCollection.groupBy({
					by: ["collectionId"],
					where: { book: where },
				})
			).map((row) => row.collectionId);
		case "tag":
			return (
				await db.bookTag.groupBy({ by: ["tagId"], where: { book: where } })
			).map((row) => row.tagId);
		case "publisher":
			return (await db.book.groupBy({ by: ["publisherId"], where })).map(
				(row) => row.publisherId,
			);
		case "series":
			return (await db.book.groupBy({ by: ["seriesId"], where })).map(
				(row) => row.seriesId,
			);
	}
}
