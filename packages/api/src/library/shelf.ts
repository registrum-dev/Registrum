// The shelves: one folder under the books mount each, all in one database.

import type { Dirent } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { createId } from "@paralleldrive/cuid2";
import type { Database } from "@registrum/db";

import type { PathsConfig } from "../context";
import { Failure, failingAs } from "../failure";
import { inside, joinRelative, safeRelative } from "../lib/paths";
import { charCount } from "../lib/text";
import { now } from "../lib/time";
import { removeCovers } from "./covers";

/** The longest name a shelf may be given. */
const NAME_MAX = 80;

export interface Shelf {
	id: string;
	name: string;
	/** Relative to the books mount; the empty string is the mount itself. */
	path: string;
	createdAt: string;
	/** Whether the folder is there to be read right now. */
	present: boolean;
}

/** One folder inside the one being shown. */
export interface Folder {
	name: string;
	path: string;
	/** The shelf this folder already is, if it is one. */
	shelf: string | null;
}

/** A folder and the folders under it, which is all the browser ever shows: a
 *  shelf is a folder, so the files in it are not the reader's choice to make. */
export interface Listing {
	path: string;
	/** `null` at the top of the mount. */
	parent: string | null;
	folders: Folder[];
	/** The shelf this folder already is, if it is one. */
	shelf: string | null;
}

/** A shelf, and the folder on disk its books are read from. */
export interface OpenShelf {
	id: string;
	path: string;
	root: string;
}

async function isFolder(path: string): Promise<boolean> {
	try {
		return (await stat(path)).isDirectory();
	} catch {
		return false;
	}
}

export async function listShelves(
	db: Database,
	config: PathsConfig,
): Promise<Shelf[]> {
	const shelves = await failingAs("db", () =>
		db.shelf.findMany({ orderBy: { createdAt: "asc" } }),
	);
	return Promise.all(
		shelves.map(async (shelf) => ({
			...shelf,
			present: await isFolder(inside(config.booksDir, shelf.path)),
		})),
	);
}

/** The shelf and its folder, or a failure for an id no shelf has. */
export async function openShelf(
	db: Database,
	config: PathsConfig,
	id: string,
): Promise<OpenShelf> {
	const shelf = await failingAs("db", () =>
		db.shelf.findUnique({ where: { id } }),
	);
	if (!shelf) throw Failure.bare("noShelf");
	return {
		id: shelf.id,
		path: shelf.path,
		root: inside(config.booksDir, shelf.path),
	};
}

function checkName(name: string): string {
	const trimmed = name.trim();
	if (trimmed === "" || charCount(trimmed) > NAME_MAX)
		throw new Failure("shelfName", name);
	return trimmed;
}

/** Makes a folder under the mount a shelf. Nothing is read yet: that is the scan. */
export async function createShelf(
	db: Database,
	config: PathsConfig,
	folder: string,
	name: string,
): Promise<Shelf> {
	const path = safeRelative(folder);
	if (!(await isFolder(inside(config.booksDir, path))))
		throw new Failure("noFolder", path);
	const named = checkName(name);

	const taken = await failingAs("db", () =>
		db.shelf.findUnique({ where: { path } }),
	);
	if (taken) throw new Failure("shelfTaken", taken.name);

	const shelf = await failingAs("db", () =>
		db.shelf.create({
			data: { id: createId(), name: named, path, createdAt: now() },
		}),
	);
	return { ...shelf, present: true };
}

export async function renameShelf(
	db: Database,
	id: string,
	name: string,
): Promise<void> {
	const named = checkName(name);
	await failingAs("db", () =>
		db.shelf.update({ where: { id }, data: { name: named } }),
	);
}

/**
 * Forgets a shelf and everything the library knew about its books. The book
 * files themselves are never touched; the thumbnails go after the records.
 */
export async function removeShelf(
	db: Database,
	config: PathsConfig,
	id: string,
): Promise<void> {
	const books = await failingAs("db", () =>
		db.book.findMany({ where: { shelfId: id }, select: { id: true } }),
	);
	await failingAs("db", () => db.shelf.delete({ where: { id } }));
	await removeCovers(
		config,
		books.map((book) => book.id),
	);
}

/** The folders inside one folder of the mount, for the browser the screen draws. */
export async function browse(
	db: Database,
	config: PathsConfig,
	at: string,
): Promise<Listing> {
	const path = safeRelative(at);
	const full = inside(config.booksDir, path);
	let entries: Dirent[];
	try {
		entries = await readdir(full, { withFileTypes: true });
	} catch (error) {
		throw new Failure("readFolder", error);
	}

	const shelves = await failingAs("db", () =>
		db.shelf.findMany({ select: { id: true, path: true } }),
	);
	const shelfAt = new Map(shelves.map((shelf) => [shelf.path, shelf.id]));

	const folders: Folder[] = [];
	for (const entry of entries) {
		if (entry.name.startsWith(".")) continue;
		const under = joinRelative(path, entry.name);
		const directory =
			entry.isDirectory() ||
			(entry.isSymbolicLink() && (await isFolder(join(full, entry.name))));
		if (!directory) continue;
		folders.push({
			name: entry.name,
			path: under,
			shelf: shelfAt.get(under) ?? null,
		});
	}
	folders.sort((a, b) =>
		a.name.localeCompare(b.name, undefined, { numeric: true }),
	);

	const parts = path.split("/").filter(Boolean);
	return {
		path,
		parent: parts.length === 0 ? null : parts.slice(0, -1).join("/"),
		folders,
		shelf: shelfAt.get(path) ?? null,
	};
}
