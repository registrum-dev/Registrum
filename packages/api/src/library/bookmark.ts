// The places in a book the reader marked to come back to.

import type { Database } from "@registrum/db";
import { z } from "zod";

import { clampFraction } from "./record";

export const bookmarkSchema = z.object({
	id: z.string().min(1).max(64),
	cfi: z.string(),
	fraction: z.number().nullish(),
	label: z.string().nullish(),
	createdAt: z.iso.datetime(),
});

export type BookmarkInput = z.infer<typeof bookmarkSchema>;

export interface Bookmark {
	id: string;
	cfi: string;
	fraction: number;
	label: string | null;
	createdAt: string;
}

/** Front to back, and in the order they were made where two share a place. */
export async function listBookmarks(
	db: Database,
	shelfId: string,
	bookId: string,
): Promise<Bookmark[]> {
	const rows = await db.bookmark.findMany({
		where: { bookId, book: { shelfId } },
		orderBy: [{ fraction: "asc" }, { createdAt: "asc" }],
	});
	return rows.map(({ id, cfi, fraction, label, createdAt }) => ({
		id,
		cfi,
		fraction: clampFraction(fraction),
		label,
		createdAt,
	}));
}

/** Sent again after a lost answer, a mark lands once. */
export async function addBookmark(
	db: Database,
	shelfId: string,
	bookId: string,
	bookmark: BookmarkInput,
): Promise<void> {
	if ((await db.book.count({ where: { id: bookId, shelfId } })) === 0) return;
	const state = {
		cfi: bookmark.cfi,
		fraction: clampFraction(bookmark.fraction ?? 0),
		label: bookmark.label ?? null,
	};
	await db.bookmark.upsert({
		where: { id: bookmark.id },
		create: {
			id: bookmark.id,
			bookId,
			createdAt: bookmark.createdAt,
			...state,
		},
		update: state,
	});
}

/** One already gone is not an error: it may have been removed elsewhere. */
export async function removeBookmark(
	db: Database,
	shelfId: string,
	bookId: string,
	bookmarkId: string,
): Promise<void> {
	await db.bookmark.deleteMany({
		where: { id: bookmarkId, bookId, book: { shelfId } },
	});
}
