// The package document, as the lists a record is made from.

import { posix } from "node:path";

import { Failure } from "../failure";
import { hasToken } from "../lib/text";
import type { Archive } from "./archive";
import {
	type Attributes,
	attribute,
	local,
	Namespaces,
	readMarkup,
	trimOrNull,
} from "./xml";

const DC_NS = "http://purl.org/dc/elements/1.1/";
const RENDITION = "http://www.idpf.org/vocab/rendition/#";

/** The MARC relator codes foliate-js knows by name. */
const RELATORS: Record<string, string> = {
	art: "artist",
	aut: "author",
	clr: "colorist",
	edt: "editor",
	ill: "illustrator",
	nrt: "narrator",
	trl: "translator",
	pbl: "publisher",
};

interface Element {
	name: string;
	id: string | null;
	attrs: Map<string, string>;
	text: string;
}

interface Meta {
	property: string;
	refines: string | null;
	id: string | null;
	text: string;
}

export interface Item {
	id: string;
	href: string;
	properties: string;
	mediaType: string;
}

interface Reference {
	kind: string;
	href: string;
}

const PARTS = ["metadata", "manifest", "spine", "guide"] as const;
type Part = (typeof PARTS)[number];

function isPart(name: string): name is Part {
	return (PARTS as readonly string[]).includes(name);
}

/** EPUB 3 writes properties bare (`title-type`), and a book may prefix them
 *  (`opf:title-type`). Both mean the same term. */
function matches(property: string, term: string): boolean {
	return property === term || local(property) === term;
}

/** An element's text, whitespace collapsed; `null` for no element, or one with
 *  nothing in it. */
export function textOf(el: Element | undefined): string | null {
	return el ? trimOrNull(el.text) : null;
}

function element(name: string, attributes: Attributes): Element {
	const attrs = new Map<string, string>();
	for (const [key, value] of Object.entries(attributes))
		attrs.set(local(key), value.trim());
	return { name, id: attrs.get("id") ?? null, attrs, text: "" };
}

/** The package document, flattened into the handful of lists the record needs. */
export class Opf {
	uniqueIdentifier: string | null = null;
	/** Dublin Core elements, by local name: title, creator, publisher, ... */
	dcElements: Element[] = [];
	/** EPUB 3 `<meta property=...>`, whether or not it refines something. */
	metas: Meta[] = [];
	/** EPUB 2 `<meta name=... content=...>`, which is where Calibre writes. */
	legacy = new Map<string, string>();
	manifest: Item[] = [];
	/** The `idref` of every `<itemref>`, in reading order. */
	spine: string[] = [];
	/** What `<spine toc=...>` names, which is the EPUB 2 table of contents. */
	tocId: string | null = null;
	guide: Reference[] = [];

	static parse(source: string): Opf {
		const opf = new Opf();
		const namespaces = new Namespaces();
		let part: Part | null = null;
		// The element whose text is still being collected; EPUB puts every value
		// it cares about in a text node rather than an attribute.
		let open: Element | null = null;

		const isValue = (name: string) =>
			namespaces.of(name) === DC_NS || local(name) === "meta";

		try {
			readMarkup(
				source,
				{
					open(name, attributes) {
						namespaces.enter(attributes);
						const bare = local(name);
						switch (bare) {
							case "package":
								opf.uniqueIdentifier = attribute(
									attributes,
									"unique-identifier",
								);
								return;
							case "metadata":
							case "manifest":
							case "guide":
								part = bare;
								return;
							case "spine":
								part = "spine";
								opf.tocId = attribute(attributes, "toc");
								return;
						}
						if (part === "metadata" && isValue(name)) {
							open = element(bare, attributes);
						} else {
							opf.structural(part, bare, attributes);
						}
					},
					text(text) {
						if (open) open.text += text;
					},
					close(name) {
						const bare = local(name);
						if (open && open.name === bare) {
							opf.take(open);
							open = null;
						} else if (isPart(bare)) {
							part = null;
						}
						namespaces.leave();
					},
				},
				true,
			);
		} catch (error) {
			throw new Failure("readBook", error);
		}
		return opf;
	}

	/** `<item>`, `<itemref>` and `<reference>` -- the elements that say where
	 *  things are rather than what the book is. */
	structural(part: Part | null, name: string, attributes: Attributes): void {
		if (part === "manifest" && name === "item") {
			const id = attribute(attributes, "id");
			const href = attribute(attributes, "href");
			if (!id || !href) return;
			this.manifest.push({
				id,
				href,
				properties: attribute(attributes, "properties") ?? "",
				mediaType: attribute(attributes, "media-type") ?? "",
			});
		} else if (part === "spine" && name === "itemref") {
			const idref = attribute(attributes, "idref");
			if (idref) this.spine.push(idref);
		} else if (part === "guide" && name === "reference") {
			const kind = attribute(attributes, "type");
			const href = attribute(attributes, "href");
			if (kind && href) this.guide.push({ kind, href });
		}
	}

	/** A finished metadata element: a Dublin Core term, or one of the two
	 *  shapes `<meta>` comes in. */
	take(el: Element): void {
		if (el.name !== "meta") {
			this.dcElements.push(el);
			return;
		}
		const property = el.attrs.get("property");
		const name = el.attrs.get("name");
		if (property !== undefined) {
			this.metas.push({
				property,
				refines: el.attrs.get("refines")?.replace(/^#/, "") ?? null,
				id: el.id,
				text: el.text,
			});
		} else if (name !== undefined) {
			const content = el.attrs.get("content");
			if (content !== undefined) this.legacy.set(name, content);
		}
	}

	dc(name: string): Element[] {
		return this.dcElements.filter((el) => el.name === name);
	}

	/** The value of a property that refines this element. */
	refined(el: Element, property: string): string | null {
		return el.id ? this.refines(el.id, property) : null;
	}

	refines(id: string, property: string): string | null {
		const meta = this.metas.find(
			(each) => each.refines === id && matches(each.property, property),
		);
		return meta ? trimOrNull(meta.text) : null;
	}

	/** Everyone the book calls an author. */
	authors(): string[] {
		const people: [Element, string][] = [
			...this.dc("creator").map((el): [Element, string] => [el, "author"]),
			...this.dc("contributor").map((el): [Element, string] => [
				el,
				"contributor",
			]),
		];
		return people
			.filter(([el, fallback]) => this.roles(el, fallback).includes("author"))
			.flatMap(([el]) => textOf(el) ?? []);
	}

	roles(el: Element, fallback: string): string[] {
		const codes = this.metas
			.filter(
				(meta) =>
					el.id !== null &&
					meta.refines === el.id &&
					matches(meta.property, "role"),
			)
			.flatMap((meta) => {
				const code = trimOrNull(meta.text);
				return code ? [code] : [];
			});
		const stated = trimOrNull(el.attrs.get("role"));
		if (stated) codes.push(stated);
		if (codes.length === 0) return [fallback];
		return codes.map((code) => RELATORS[code] ?? fallback);
	}

	/** The date the book was published, which EPUB 2 marks with an event
	 *  attribute and EPUB 3 simply states. */
	published(): string | null {
		const dates = this.dc("date");
		return textOf(
			dates.find((el) => el.attrs.get("event") === "publication") ?? dates[0],
		);
	}

	/** The identifier the package points at, which is the one that names the
	 *  book; the others are alternates. */
	identifier(): string | null {
		const identifiers = this.dc("identifier");
		const wanted = this.uniqueIdentifier;
		return textOf(
			(wanted ? identifiers.find((el) => el.id === wanted) : undefined) ??
				identifiers[0],
		);
	}

	/** The series this book belongs to. */
	series(): { name: string | null; index: number | null } {
		const stated = this.metas.find(
			(meta): meta is Meta & { id: string } =>
				meta.refines === null &&
				matches(meta.property, "belongs-to-collection") &&
				meta.id !== null &&
				this.refines(meta.id, "collection-type") === "series",
		);
		if (stated) {
			// EPUB allows positions like "2.2.1", which is not a number; such a
			// series keeps its name and loses only the volume.
			return {
				name: trimOrNull(stated.text),
				index: readNumber(this.refines(stated.id, "group-position")),
			};
		}
		const name = trimOrNull(this.legacy.get("calibre:series"));
		if (!name) return { name: null, index: null };
		return {
			name,
			index: readNumber(
				this.legacy.get("calibre:series_index")?.trim() ?? null,
			),
		};
	}

	prePaginated(): boolean {
		return this.metas.some(
			(meta) =>
				meta.refines === null &&
				(matches(meta.property, "rendition:layout") ||
					meta.property === `${RENDITION}layout`) &&
				meta.text.trim() === "pre-paginated",
		);
	}

	/** Where the cover image is, in the three places a book may say so. */
	coverHref(): string | null {
		const byProperty = this.manifest.find((item) =>
			hasToken(item.properties, "cover-image"),
		);
		if (byProperty) return byProperty.href;

		// EPUB 2 named the manifest item from a metadata entry instead.
		const id = this.legacy.get("cover");
		if (id !== undefined) {
			const item = this.manifest.find((each) => each.id === id);
			if (item) return item.href;
		}

		const reference = this.guide.find((each) => hasToken(each.kind, "cover"));
		return reference?.href ?? null;
	}
}

/** A decimal number, as Rust's `f64::parse` would read one. */
function readNumber(value: string | null): number | null {
	if (value === null || !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(value))
		return null;
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

/** The package document, and the folder it sits in: every href inside it is
 *  spelled relative to that folder. */
export async function readOpf(
	archive: Archive,
): Promise<{ opf: Opf; base: string }> {
	const path = await container(archive);
	const source = await archive.text(path);
	if (source === null) throw new Failure("readBook", path);
	return { opf: Opf.parse(source), base: parentOf(path) };
}

/** Where the package document is. This is the one path in an EPUB that is
 *  fixed, and everything else is found from it. */
async function container(archive: Archive): Promise<string> {
	const source = await archive.text("META-INF/container.xml");
	if (source === null) throw Failure.bare("notEpub");
	let found: string | null = null;
	try {
		readMarkup(
			source,
			{
				open(name, attributes) {
					if (found === null && local(name) === "rootfile") {
						const full = attribute(attributes, "full-path");
						if (full) found = resolve("", full);
					}
				},
			},
			true,
		);
	} catch {
		// A broken container is no container.
	}
	if (found === null) throw Failure.bare("notEpub");
	return found;
}

/** The folder an entry sits in, `""` for the top of the archive. Takes an
 *  entry as `resolve` spells it: no leading or trailing `/`. */
export function parentOf(path: string): string {
	const parent = posix.dirname(path);
	return parent === "." ? "" : parent;
}

/** An href in a package document is a URL relative to it; an entry in the
 *  archive is a plain path. This turns one into the other. */
export function resolve(base: string, href: string): string {
	let path = href.split("#")[0] ?? href;
	try {
		path = decodeURIComponent(path);
	} catch {
		// A stray `%` is a character, not an escape.
	}
	// Resolved against the archive's root as `/`: an href that starts with `/`
	// starts there, and `..` cannot climb above it.
	return posix.resolve("/", base, path.replaceAll("\\", "/")).slice(1);
}
