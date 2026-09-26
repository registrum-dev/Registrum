// The thumbnails, one flat folder of them named by book id.

import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { LibraryConfig } from "../context";
import { Failure } from "../failure";

/** Where the thumbnails are kept. */
export function coverDir(config: LibraryConfig): string {
	return join(config.dataDir, "covers");
}

/** A book id names a file, so it must not be able to climb out of the folder.
 *  The ids we write are cuids; nothing else is accepted. */
export function coverFile(id: string): string {
	if (!/^[a-zA-Z0-9]+$/.test(id)) throw new Failure("badId", id);
	return `${id}.webp`;
}

/** Stores a thumbnail and hands back the name the record keeps. */
export async function writeCover(
	config: LibraryConfig,
	id: string,
	bytes: Buffer,
): Promise<string> {
	const name = coverFile(id);
	const dir = coverDir(config);
	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, name), bytes);
	return name;
}

/** Drops the thumbnails of books the library has just forgotten. A missing
 *  thumbnail is not an error: plenty of books never had a cover. */
export async function forgetCovers(
	config: LibraryConfig,
	ids: readonly string[],
): Promise<void> {
	const dir = coverDir(config);
	await Promise.all(
		ids.map(async (id) => {
			try {
				await rm(join(dir, coverFile(id)), { force: true });
			} catch {
				// Nothing to drop.
			}
		}),
	);
}
