// An EPUB's own words, flattened for what is sent to a model.

import { charCount } from "../util/text";
import { withArchive } from "./archive";
import { readOpf, resolve } from "./opf";
import { plainText } from "./plain";
import { tableOfContents } from "./toc";

/** One spine item that had something to say. */
export interface Section {
	/** Its place in the spine, which is what the prompt reports as `n/total`. */
	index: number;
	/** The chapter this item belongs to, from the table of contents. */
	label: string | null;
	text: string;
}

/** A book's text, in reading order. */
export interface BookText {
	sections: Section[];
	/** Every spine item, including the ones with no words in them. */
	sectionTotal: number;
	chars: number;
}

/** Reads a book's words. */
export function readText(file: string): Promise<BookText> {
	return withArchive(file, async (archive) => {
		const { opf, base } = await readOpf(archive);
		const byId = new Map(opf.manifest.map((item) => [item.id, item]));
		const labels = await tableOfContents(archive, opf, base);

		const sections: Section[] = [];
		let chars = 0;
		// A chapter that runs across several spine items names them all: the
		// table of contents points at the first one only.
		let carried: string | null = null;

		for (const [index, idref] of opf.spine.entries()) {
			const item = byId.get(idref);
			if (!item) continue;
			const name = resolve(base, item.href);
			const label = labels.get(name);
			if (label !== undefined) carried = label;

			const source = await archive.text(name);
			if (source === null) continue;
			const text = plainText(source);
			if (!text) continue;
			chars += charCount(text);
			sections.push({ index, label: carried, text });
		}

		return { sections, sectionTotal: opf.spine.length, chars };
	});
}
