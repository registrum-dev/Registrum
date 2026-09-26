// A comic archive: a zip of images.

import { Failure } from "../failure";
import type { BookFormat } from "../vocabulary";
import type { Archive } from "./archive";
import { type BookRead, bareBook } from "./book";

/** The extensions a page may be stored under, as foliate-js reads them, so that
 *  the shelf and the reader agree on how many pages a book has -- each with the
 *  media type a page stored under it is. */
const PAGE_TYPES = new Map([
	[".jpg", "image/jpeg"],
	[".jpeg", "image/jpeg"],
	[".png", "image/png"],
	[".gif", "image/gif"],
	[".bmp", "image/bmp"],
	[".webp", "image/webp"],
	[".svg", "image/svg+xml"],
	[".jxl", "image/jxl"],
	[".avif", "image/avif"],
]);

/** Page 2 comes before page 10: the order foliate-js sorts a comic's pages in. */
const pageOrder = new Intl.Collator([], { numeric: true }).compare;

/** A comic archive states nothing about itself: no title, no author, no date.
 *  The file name is all there is, and the pages are the sections. */
export async function readComic(
	archive: Archive,
	stem: string,
	format: BookFormat,
): Promise<BookRead> {
	const found = pages(archive);
	const first = found[0];
	if (first === undefined) throw Failure.bare("noPages");

	const parsed = bareBook(stem, format);
	parsed.layout = "pre-paginated";
	parsed.sections = found.length;

	return { parsed, cover: await archive.entry(first) };
}

/** The pages, in the order they are read. The reader turns the same list, so
 *  that a page number on the shelf and one in the reader mean the same page. */
export function pages(archive: Archive): string[] {
	return archive
		.names()
		.filter((name) => extensionOf(name) !== null)
		.sort(pageOrder);
}

/** The media type a page's name says it is stored as. */
export function mediaType(name: string): string {
	const ext = extensionOf(name);
	return (ext && PAGE_TYPES.get(ext)) ?? "application/octet-stream";
}

/** The page extension a name ends in, lower-cased, or `null` for none. */
function extensionOf(name: string): string | null {
	const lower = name.toLowerCase();
	for (const ext of PAGE_TYPES.keys()) if (lower.endsWith(ext)) return ext;
	return null;
}
