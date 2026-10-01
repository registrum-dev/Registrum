// One book as the screen sees it.

import type { Client, Prisma } from "@registrum/db";

import type { BookIdentifier } from "../util/identifier";
import {
	type BookCategory,
	type BookFormat,
	type BookLayout,
	type BookStatus,
	FINISHED,
	readCategory,
	readFormat,
	readLayout,
	toDay,
	validRating,
} from "../vocabulary";

/** How many ids go into one `in` list. */
export const BATCH = 900;

export interface ReadingPosition {
	cfi: string;
	fraction: number;
	label: string | null;
	updatedAt: string;
}

export interface BookRecord {
	id: string;
	path: string;
	format: BookFormat;
	layout: BookLayout;
	size: number;
	mtime: number;

	title: string;
	subtitle: string | null;
	authors: string[];
	publisher: string | null;
	language: string | null;
	published: string | null;
	/** `published` as a calendar day, `YYYY-MM-DD`, when it names one. */
	publishedDay: string | null;
	identifiers: BookIdentifier[];
	series: string | null;
	seriesIndex: number | null;
	description: string | null;
	sections: number;

	collections: string[];
	tags: string[];
	category: BookCategory | null;
	note: string | null;
	rating: number | null;
	favorite: boolean;

	/** The thumbnail's file name, when there is one. */
	coverFile: string | null;
	missing: boolean;
	/** Derived from the reading position, never stored. Here so that the
	 *  screen draws it rather than works it out again. */
	status: BookStatus;

	addedAt: string;
	scannedAt: string;
	lastOpenedAt: string | null;
	position: ReadingPosition | null;
}

const byPosition = { orderBy: { position: "asc" } } as const;

/** Everything a record is made of: the row, the two names it points at, the
 *  lists it carries in order, and the reading position. */
export const BOOK_INCLUDE = {
	publisher: { select: { name: true } },
	series: { select: { name: true } },
	position: true,
	identifiers: { ...byPosition, select: { scheme: true, value: true } },
	authors: { ...byPosition, select: { author: { select: { name: true } } } },
	collections: {
		...byPosition,
		select: { collection: { select: { name: true } } },
	},
	tags: { ...byPosition, select: { tag: { select: { name: true } } } },
} satisfies Prisma.BookInclude;

type BookRow = Prisma.BookGetPayload<{ include: typeof BOOK_INCLUDE }>;

/** A list cut into pieces no longer than `size`. */
export function chunks<T>(values: readonly T[], size: number): T[][] {
	const out: T[][] = [];
	for (let at = 0; at < values.length; at += size)
		out.push(values.slice(at, at + size));
	return out;
}

/** One query per batch of ids, and every row they found, in batch order. */
export async function inBatches<T>(
	ids: readonly string[],
	query: (batch: string[]) => Promise<T[]>,
): Promise<T[]> {
	const found: T[] = [];
	for (const batch of chunks(ids, BATCH)) found.push(...(await query(batch)));
	return found;
}

/** The records these conditions let through, in the order given. */
export async function findRecords(
	db: Client,
	args: Omit<Prisma.BookFindManyArgs, "include" | "select">,
): Promise<BookRecord[]> {
	const rows = await db.book.findMany({ ...args, include: BOOK_INCLUDE });
	return rows.flatMap((row) => recordOf(row) ?? []);
}

/** The records for these books, in however many queries the ids take. Given a
 *  shelf, a book on any other shelf is not found. */
export async function recordsFor(
	db: Client,
	ids: readonly string[],
	shelfId?: string,
): Promise<BookRecord[]> {
	return inBatches(ids, (batch) =>
		findRecords(db, { where: { id: { in: batch }, shelfId } }),
	);
}

/** One row as the record the screen draws. `null` for a format this version
 *  cannot open. */
export function recordOf(row: BookRow): BookRecord | null {
	const format = readFormat(row.format);
	if (!format) return null;
	const position = positionOf(row.position);
	return {
		id: row.id,
		path: row.path,
		format,
		layout: readLayout(row.layout) ?? "reflowable",
		size: Number(row.size),
		mtime: Number(row.mtime),
		title: row.title,
		subtitle: row.subtitle,
		authors: row.authors.map((each) => each.author.name),
		publisher: row.publisher?.name ?? null,
		language: row.language,
		published: row.published,
		publishedDay: row.published ? publishedDay(row.published) : null,
		identifiers: row.identifiers,
		series: row.series?.name ?? null,
		seriesIndex: row.seriesIndex,
		description: row.description,
		sections: row.sections,
		collections: row.collections.map((each) => each.collection.name),
		tags: row.tags.map((each) => each.tag.name),
		category: readCategory(row.category),
		note: row.note,
		rating: validRating(row.rating),
		favorite: row.favorite,
		coverFile: row.coverFile,
		missing: row.missing,
		status: statusOf(position),
		addedAt: row.addedAt,
		scannedAt: row.scannedAt,
		lastOpenedAt: row.lastOpenedAt,
		position,
	};
}

/** Where the reader stopped, if the book has a reading position. */
function positionOf(position: BookRow["position"]): ReadingPosition | null {
	if (!position) return null;
	return {
		cfi: position.cfi,
		fraction: clampFraction(position.fraction),
		label: position.label,
		updatedAt: position.updatedAt,
	};
}

/** A reading position's fraction, kept between the start and the end. */
export function clampFraction(fraction: number): number {
	return Math.min(1, Math.max(0, fraction));
}

export function statusOf(position: { fraction: number } | null): BookStatus {
	if (!position) return "unread";
	return position.fraction >= FINISHED ? "finished" : "reading";
}

/** Reading first, then unread, then done -- the order the shelf is used in. */
export const STATUS_RANK: Record<BookStatus, number> = {
	reading: 0,
	unread: 1,
	finished: 2,
};

/** `statusOf`, as the `where` of a book query. */
export const STATUS_WHERE: Record<BookStatus, Prisma.BookWhereInput> = {
	unread: { statusRank: STATUS_RANK.unread },
	reading: { statusRank: STATUS_RANK.reading },
	finished: { statusRank: STATUS_RANK.finished },
};

/** The day at the head of a publication date, if it is a real one:
 *  `2024-03-05`, `2024/3/5` or a timestamp starting with either. */
export function publishedDay(value: string): string | null {
	const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?!\d)/.exec(value.trim());
	if (!match) return null;
	return toDay(Number(match[1]), Number(match[2]), Number(match[3]));
}
