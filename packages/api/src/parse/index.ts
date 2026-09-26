// Reading one book file: what it says about itself, and its cover.

import { readFile } from "node:fs/promises";

import { Failure } from "../failure";
import { fileStem } from "../lib/paths";
import { formatOfName } from "../vocabulary";
import { withArchive } from "./archive";
import type { BookRead } from "./book";
import { readComic } from "./comic";
import { readEpub } from "./epub";
import { readPdf } from "./pdf";
import { encodeCover } from "./thumb";

export type { ParsedBook } from "./book";

/** Reads one book file. `file` is where it is on disk; `relative` is how the
 *  shelf names it, which is what its format and fallback title come from. The
 *  cover comes back as the WebP thumbnail, or `null` for a book with no cover
 *  we can read. */
export async function readBook(
	file: string,
	relative: string,
): Promise<BookRead> {
	const format = formatOfName(relative);
	if (!format) throw new Failure("readBook", relative);
	const stem = fileStem(relative);

	let read: BookRead;
	switch (format) {
		case "epub":
			read = await withArchive(file, (archive) => readEpub(archive, stem));
			break;
		case "cbz":
		case "zip":
			read = await withArchive(file, (archive) =>
				readComic(archive, stem, format),
			);
			break;
		case "pdf": {
			let data: Buffer;
			try {
				data = await readFile(file);
			} catch (error) {
				throw new Failure("readBook", error);
			}
			read = await readPdf(new Uint8Array(data), stem);
			break;
		}
	}

	return {
		parsed: read.parsed,
		cover: read.cover ? await encodeCover(read.cover) : null,
	};
}
