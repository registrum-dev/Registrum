// Markup as the words in it, for what is sent to a model.

import { local, readMarkup } from "./xml";

/** The tags whose text is the reading of the characters beside them, not words
 *  of the book. Dropping them is what keeps ruby out of the prompt. */
const READING = new Set(["rt", "rp"]);

/** Tags whose content is not the book at all. */
const SILENT = new Set(["head", "script", "style", "title"]);

/** Tags that end a paragraph. Anything else runs on, the way the text does. */
const BREAKS = new Set([
	"p",
	"div",
	"br",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"li",
	"tr",
	"td",
	"section",
	"article",
	"blockquote",
	"figcaption",
	"hr",
]);

/** A gap the source wrapped a line in, held until what follows it is known.
 *  Nothing in a book is a control character, so neither can be mistaken for
 *  one of its words. */
const WRAPPED = "\u0000";
/** A gap the source actually wrote a space in. */
const WRITTEN = "\u0001";

/** A tag's local name, in the case the lenient reader gives every tag. */
export function tag(name: string): string {
	return local(name).toLowerCase();
}

/** The markup of one content document, as the words in it. */
export function plainText(source: string): string {
	const out: string[] = [];
	const line = new Line();
	// Depth inside a tag whose text is not the book's, so that nesting does not
	// switch it back on early.
	let hidden = 0;

	const flush = () => {
		const text = line.take().trim();
		if (text) out.push(text);
	};

	readMarkup(
		source,
		{
			open(name) {
				const bare = tag(name);
				if (READING.has(bare) || SILENT.has(bare)) hidden += 1;
				else if (hidden === 0 && BREAKS.has(bare)) flush();
			},
			text(text) {
				if (hidden === 0) line.push(text);
			},
			close(name) {
				const bare = tag(name);
				if (READING.has(bare) || SILENT.has(bare))
					hidden = Math.max(0, hidden - 1);
				else if (hidden === 0 && BREAKS.has(bare)) flush();
			},
		},
		false,
	);
	flush();
	return out.join("\n");
}

/** One paragraph as it is collected, with the source's whitespace collapsed. */
export class Line {
	#text = "";

	/** Appends one run of text. */
	push(text: string): void {
		// null outside whitespace; inside it, whether the run held only wrapping.
		let gap: boolean | null = null;
		for (const character of text) {
			if (/\s/u.test(character)) {
				const wrapped = character === "\n" || character === "\r";
				gap = (gap ?? true) && wrapped;
				continue;
			}
			if (gap !== null) {
				this.#hold(gap);
				gap = null;
			}
			this.#join(character);
			this.#text += character;
		}
		if (gap !== null) this.#hold(gap);
	}

	/** The paragraph so far, with a gap nothing followed dropped, and cleared. */
	take(): string {
		while (this.#text.endsWith(WRAPPED) || this.#text.endsWith(WRITTEN)) {
			this.#text = this.#text.slice(0, -1);
		}
		const text = this.#text;
		this.#text = "";
		return text;
	}

	/** Remembers that a gap is open. A gap the author wrote outranks one that
	 *  is only wrapping, however the two runs met. */
	#hold(wrapped: boolean): void {
		if (this.#text.endsWith(WRITTEN)) return;
		if (this.#text.endsWith(WRAPPED)) this.#text = this.#text.slice(0, -1);
		this.#text += wrapped ? WRAPPED : WRITTEN;
	}

	/** Turns whatever gap is open into a space, or into nothing. */
	#join(next: string): void {
		let wrapped: boolean;
		if (this.#text.endsWith(WRAPPED)) wrapped = true;
		else if (this.#text.endsWith(WRITTEN)) wrapped = false;
		else return;
		this.#text = this.#text.slice(0, -1);

		const previous = [...this.#text].at(-1);
		// Nothing before it: a gap at the start of a paragraph is not a gap.
		if (previous === undefined) return;
		if (wrapped && (wide(previous) || wide(next))) return;
		if (!this.#text.endsWith(" ")) this.#text += " ";
	}
}

/** Whether a character sets its own word boundaries -- CJK ideographs, kana,
 *  and the full-width punctuation that goes with them. */
function wide(character: string): boolean {
	const code = character.codePointAt(0) ?? 0;
	return (
		(code >= 0x3000 && code <= 0x303f) ||
		(code >= 0x3040 && code <= 0x30ff) ||
		(code >= 0x3400 && code <= 0x4dbf) ||
		(code >= 0x4e00 && code <= 0x9fff) ||
		(code >= 0xf900 && code <= 0xfaff) ||
		(code >= 0xff00 && code <= 0xffef)
	);
}
