// A book's chapter names, by the document each one starts at.

import { hasToken } from "../lib/text";
import type { Archive } from "./archive";
import { type Opf, parentOf, resolve } from "./opf";
import { Line, tag } from "./plain";
import { attribute, readMarkup } from "./xml";

/** Chapter names by the content document they point at. */
export async function tableOfContents(
	archive: Archive,
	opf: Opf,
	base: string,
): Promise<Map<string, string>> {
	const nav = opf.manifest.find((item) => hasToken(item.properties, "nav"));
	if (nav) {
		const name = resolve(base, nav.href);
		const source = await archive.text(name);
		if (source !== null) {
			const found = navLabels(source, parentOf(name));
			if (found.size > 0) return found;
		}
	}

	const ncx =
		(opf.tocId
			? opf.manifest.find((item) => item.id === opf.tocId)
			: undefined) ??
		opf.manifest.find((item) => item.mediaType === "application/x-dtbncx+xml");
	if (ncx) {
		const name = resolve(base, ncx.href);
		const source = await archive.text(name);
		if (source !== null) return ncxLabels(source, parentOf(name));
	}
	return new Map();
}

/** `<nav epub:type="toc">`: the name is the link's text, the target its href. */
function navLabels(source: string, base: string): Map<string, string> {
	const found = new Map<string, string>();
	// The document holds several `<nav>` lists (toc, landmarks, page-list) and
	// only the first is the table of contents.
	let insideToc = false;
	let seenNav = false;
	let href: string | null = null;
	const label = new Line();

	try {
		readMarkup(
			source,
			{
				open(name, attributes) {
					const bare = tag(name);
					if (bare === "nav" && !seenNav) {
						const kind = attribute(attributes, "type") ?? "";
						insideToc = kind === "" || hasToken(kind, "toc");
						seenNav = insideToc;
					} else if (bare === "a" && insideToc) {
						const target = attribute(attributes, "href");
						href = target ? resolve(base, target) : null;
						label.take();
					}
				},
				text(text) {
					if (href !== null) label.push(text);
				},
				close(name) {
					const bare = tag(name);
					if (bare === "a") {
						if (href !== null) record(found, href, label);
						href = null;
					} else if (bare === "nav") {
						insideToc = false;
					}
				},
			},
			false,
		);
	} catch {
		// What was read before the markup broke is still a table of contents.
	}
	return found;
}

/** `<navPoint>`: the name is in `<navLabel><text>`, the target in `<content>`. */
function ncxLabels(source: string, base: string): Map<string, string> {
	const found = new Map<string, string>();
	const label = new Line();
	let collecting = false;

	try {
		readMarkup(
			source,
			{
				open(name, attributes) {
					const bare = tag(name);
					if (bare === "content") {
						const src = attribute(attributes, "src");
						if (src) record(found, resolve(base, src), label);
					} else if (bare === "navlabel") {
						label.take();
						collecting = true;
					} else if (bare === "navpoint") {
						label.take();
					}
				},
				text(text) {
					if (collecting) label.push(text);
				},
				close(name) {
					if (tag(name) === "navlabel") collecting = false;
				},
			},
			false,
		);
	} catch {
		// As above.
	}
	return found;
}

/** One chapter name for one document. The first name written for a target
 *  stays: a table of contents that points twice at the same file is naming the
 *  chapter it opens, and then something inside it. */
function record(found: Map<string, string>, target: string, label: Line): void {
	const name = label.take().trim();
	if (name && !found.has(target)) found.set(target, name);
}
