// What the reader opens: a book's file, and a comic archive held open so its
// pages can be handed out one at a time.

import { createId } from "@paralleldrive/cuid2";
import type { Database } from "@registrum/db";

import type { PathsConfig } from "../context";
import { Failure, failingAs } from "../failure";
import { Archive } from "../parse/archive";
import { mediaType, pages } from "../parse/comic";
import { fileName, inside } from "../util/paths";
import { type BookFormat, readFormat } from "../vocabulary";

/** A book's file, where it is on disk. */
export interface BookFile {
	path: string;
	/** The file's own name, which is what the reader tells formats apart by. */
	name: string;
	format: BookFormat;
}

/** The file behind a book on any shelf. */
export async function bookFile(
	db: Database,
	config: PathsConfig,
	id: string,
): Promise<BookFile> {
	const book = await failingAs("db", () =>
		db.book.findUnique({
			where: { id },
			select: { path: true, format: true, shelf: { select: { path: true } } },
		}),
	);
	const format = readFormat(book?.format);
	if (!book || !format) throw Failure.bare("noBook");
	const shelfRoot = inside(config.booksDir, book.shelf.path);
	return {
		path: inside(shelfRoot, book.path),
		name: fileName(book.path),
		format,
	};
}

/** What the reader needs to build the book: a key to ask for pages with, and the
 *  pages themselves, in reading order. */
export interface ComicBook {
	/** Names the open archive. A page URL carries this rather than a path, so
	 *  that a browser can reach the book it is reading and nothing else. */
	key: string;
	pages: string[];
}

interface Comic {
	key: string;
	pages: string[];
	archive: Archive;
}

/** How many archives are held open at once: a few readers at a time. Past that,
 *  opening another lets the one opened longest ago go. */
const HELD = 8;

const open: Comic[] = [];

/** Opens the archive behind a comic and keeps it open. */
export async function openComic(
	db: Database,
	config: PathsConfig,
	id: string,
): Promise<ComicBook> {
	const file = await bookFile(db, config, id);
	const archive = await Archive.open(file.path);
	const found = pages(archive);
	if (found.length === 0) {
		archive.close();
		throw Failure.bare("noPages");
	}
	const key = createId();
	open.push({ key, pages: found, archive });
	for (const gone of open.splice(0, Math.max(0, open.length - HELD)))
		gone.archive.close();
	return { key, pages: found };
}

/** Lets the archive go. A key that is not open is a book already let go of. */
export function closeComic(key: string): void {
	const at = open.findIndex((comic) => comic.key === key);
	if (at < 0) return;
	const [comic] = open.splice(at, 1);
	comic?.archive.close();
}

/** One page, decompressed, with the media type its name says it is stored as. */
export async function comicPage(
	key: string,
	index: number,
): Promise<{ type: string; bytes: Uint8Array<ArrayBuffer> }> {
	const comic = open.find((each) => each.key === key);
	// Closed, or pushed out by newer ones: to the asker, not there.
	if (!comic) throw new Failure("noBook", "no such book open");
	const name = comic.pages[index];
	if (name === undefined) throw new Failure("badPath", String(index));
	const bytes = await comic.archive.entry(name);
	if (!bytes) throw new Failure("readBook", name);
	return { type: mediaType(name), bytes };
}
