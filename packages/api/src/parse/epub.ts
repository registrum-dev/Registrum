// An EPUB: the package document says everything else.

import type { Archive } from "./archive";
import { type BookRead, bareBook, type ParsedBook } from "./book";
import { type Opf, readOpf, resolve, textOf } from "./opf";
import { attribute, local, readMarkup } from "./xml";

export async function readEpub(
	archive: Archive,
	stem: string,
): Promise<BookRead> {
	const { opf, base } = await readOpf(archive);

	const parsed = metadata(opf, stem);
	if (opf.prePaginated() || (await fixedLayout(archive)))
		parsed.layout = "pre-paginated";

	const href = opf.coverHref();
	const cover = href ? await archive.entry(resolve(base, href)) : null;
	return { parsed, cover };
}

/** What the package document says the book is. */
function metadata(opf: Opf, stem: string): ParsedBook {
	const parsed = bareBook(stem, "epub");

	const titles = opf.dc("title");
	const main =
		titles.find((el) => opf.refined(el, "title-type") === "main") ?? titles[0];
	const title = textOf(main);
	if (title) parsed.title = title;
	parsed.subtitle = textOf(
		titles.find((el) => opf.refined(el, "title-type") === "subtitle"),
	);
	parsed.authors = opf.authors();
	parsed.publisher = textOf(opf.dc("publisher")[0]);
	parsed.language = textOf(opf.dc("language")[0]);
	parsed.published = opf.published();
	parsed.identifier = opf.identifier();
	parsed.description = textOf(opf.dc("description")[0]);

	const series = opf.series();
	parsed.series = series.name;
	parsed.seriesIndex = series.index;

	parsed.sections = opf.spine.length;
	return parsed;
}

/** Apple's own way of saying a book is fixed-layout, which predates
 *  `rendition:layout` and is still what some shops ship. */
async function fixedLayout(archive: Archive): Promise<boolean> {
	const source = await archive.text(
		"META-INF/com.apple.ibooks.display-options.xml",
	);
	if (source === null) return false;

	let inside = false;
	let fixed = false;
	try {
		readMarkup(
			source,
			{
				open(name, attributes) {
					if (local(name) === "option")
						inside = attribute(attributes, "name") === "fixed-layout";
				},
				text(text) {
					if (inside && text.trim() === "true") fixed = true;
				},
				close() {
					inside = false;
				},
			},
			true,
		);
	} catch {
		return false;
	}
	return fixed;
}
