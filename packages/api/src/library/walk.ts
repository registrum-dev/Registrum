// A shelf's files: the walk that finds them, and a look at one of them.

import { createHash } from "node:crypto";
import { createReadStream, type Dirent, type Stats } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

import { Failure } from "../failure";
import { inside, joinRelative, safeRelative } from "../util/paths";
import { compare } from "../util/text";
import { formatOfName } from "../vocabulary";

export interface ScannedFile {
	/** Relative to the shelf's folder, always `/`-separated. */
	path: string;
	size: number;
	/** Milliseconds since the epoch. */
	mtime: number;
}

/** Dot-folders hold no books. */
function skipped(name: string): boolean {
	return name.startsWith(".");
}

/** Walks the shelf for books, depth first. */
export async function walk(root: string): Promise<ScannedFile[]> {
	// The root has to be readable for there to be a shelf at all; a folder
	// further down that is not is stepped over.
	let top: Dirent[];
	try {
		top = await readdir(root, { withFileTypes: true });
	} catch {
		throw Failure.bare("noFolder");
	}

	const found: ScannedFile[] = [];
	const stack: [string, Dirent[]][] = [["", top]];
	while (stack.length > 0) {
		const [at, entries] = stack.pop() as [string, Dirent[]];
		for (const entry of entries) {
			if (skipped(entry.name)) continue;
			const path = joinRelative(at, entry.name);
			const full = join(root, path);
			// A link is looked through once, and what it points at is used for
			// the rest; anything else is looked at only if it may be a book.
			let target: Stats | null = null;
			if (entry.isSymbolicLink()) {
				target = await stat(full).catch(() => null);
				if (!target) continue;
			}
			if (target ? target.isDirectory() : entry.isDirectory()) {
				try {
					stack.push([path, await readdir(full, { withFileTypes: true })]);
				} catch {
					// An unreadable folder is stepped over.
				}
				continue;
			}
			if (!(target ? target.isFile() : entry.isFile())) continue;
			if (!formatOfName(entry.name)) continue;
			// Gone between the listing and the look: stepped over.
			const info = target ?? (await stat(full).catch(() => null));
			if (info) found.push(scanned(path, info));
		}
	}
	found.sort((a, b) => compare(a.path, b.path));
	return found;
}

function scanned(path: string, info: Stats): ScannedFile {
	return { path, size: info.size, mtime: Math.floor(info.mtimeMs) };
}

/** SHA-256 of a file's bytes, hex. */
export async function hashFile(path: string): Promise<string> {
	const hash = createHash("sha256");
	for await (const chunk of createReadStream(path)) hash.update(chunk);
	return hash.digest("hex");
}

/** Looks at one book file, the way the walk would have. */
export async function statBook(
	root: string,
	path: string,
): Promise<ScannedFile | null> {
	const relative = safeRelative(path);
	try {
		const info = await stat(inside(root, relative));
		return info.isFile() ? scanned(relative, info) : null;
	} catch {
		return null;
	}
}
