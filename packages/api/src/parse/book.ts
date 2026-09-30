// What a book's file says about itself.

import type { BookIdentifier } from "../util/identifier";
import type { BookFormat, BookLayout } from "../vocabulary";

export interface ParsedBook {
	title: string;
	subtitle: string | null;
	authors: string[];
	publisher: string | null;
	language: string | null;
	published: string | null;
	identifiers: BookIdentifier[];
	series: string | null;
	seriesIndex: number | null;
	description: string | null;
	format: BookFormat;
	layout: BookLayout;
	sections: number;
}

/** A book's file, read: what it says about itself, and its cover as the file
 *  holds it -- or `null` for a book with no cover to read. */
export interface BookRead {
	parsed: ParsedBook;
	cover: Buffer | null;
}

/** A book with nothing but the two things every file has: a name and a
 *  format. Each reader fills in what its format actually states. */
export function bareBook(title: string, format: BookFormat): ParsedBook {
	return {
		title,
		subtitle: null,
		authors: [],
		publisher: null,
		language: null,
		published: null,
		identifiers: [],
		series: null,
		seriesIndex: null,
		description: null,
		format,
		layout: "reflowable",
		sections: 0,
	};
}
