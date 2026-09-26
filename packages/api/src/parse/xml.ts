// A thin event reader over htmlparser2, shaped like the pull parser the
// package document and the content documents are read with.

import { Parser } from "htmlparser2";

export type Attributes = Record<string, string>;

export interface XmlHandlers {
	open?: (name: string, attributes: Attributes) => void;
	text?: (text: string) => void;
	close?: (name: string) => void;
}

/**
 * Reads a document start to end. `xml` keeps names as written and reads only
 * XML's own entities; without it the markup is read the way a browser reads
 * XHTML, which is lenient about the tags a book gets wrong and knows `&nbsp;`.
 */
export function readMarkup(
	source: string,
	handlers: XmlHandlers,
	xml: boolean,
): void {
	const parser = new Parser(
		{
			onopentag: (name, attributes) => handlers.open?.(name, attributes),
			ontext: (text) => handlers.text?.(text),
			onclosetag: (name) => handlers.close?.(name),
		},
		{
			xmlMode: xml,
			decodeEntities: true,
			recognizeSelfClosing: true,
			recognizeCDATA: true,
			lowerCaseTags: !xml,
			lowerCaseAttributeNames: false,
		},
	);
	parser.write(source);
	parser.end();
}

/** The part of a name after its prefix: `dc:title` is `title`. */
export function local(name: string): string {
	const colon = name.lastIndexOf(":");
	return colon < 0 ? name : name.slice(colon + 1);
}

/** The prefix of a name, or the empty string for one with none. */
function prefix(name: string): string {
	const colon = name.lastIndexOf(":");
	return colon < 0 ? "" : name.slice(0, colon);
}

/** An attribute by its local name, trimmed: `opf:role` answers for `role`. */
export function attribute(attributes: Attributes, name: string): string | null {
	if (name in attributes) return attributes[name]?.trim() ?? null;
	for (const [key, value] of Object.entries(attributes)) {
		if (local(key) === name) return value.trim();
	}
	return null;
}

/**
 * The namespaces in force, element by element: a prefix is looked up from the
 * innermost element that declares it.
 */
export class Namespaces {
	#stack: Map<string, string>[] = [];

	enter(attributes: Attributes): void {
		const declared = new Map<string, string>();
		for (const [key, value] of Object.entries(attributes)) {
			if (key === "xmlns") declared.set("", value);
			else if (key.startsWith("xmlns:")) declared.set(key.slice(6), value);
		}
		this.#stack.push(declared);
	}

	leave(): void {
		this.#stack.pop();
	}

	/** The namespace the name's prefix is bound to, if any. */
	of(name: string): string | null {
		const wanted = prefix(name);
		for (let at = this.#stack.length - 1; at >= 0; at -= 1) {
			const found = this.#stack[at]?.get(wanted);
			if (found !== undefined) return found;
		}
		return null;
	}
}

/** Whitespace inside a value is collapsed the way XML asks, so that a title
 *  broken across lines in the source reads as one line on the shelf. */
export function tidy(value: string | null | undefined): string | null {
	if (value == null) return null;
	const out = value
		.split(/[ \t\n\r\f]+/)
		.filter(Boolean)
		.join(" ");
	return out === "" ? null : out;
}
