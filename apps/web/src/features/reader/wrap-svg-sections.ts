// SVG spine items, wrapped as XHTML.

import type { FoliateBook, FoliateSection } from "@/features/reader/foliate";

/** SVG namespace URI, for telling a real SVG document from a stray parse. */
const SVG_NS = "http://www.w3.org/2000/svg";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

/**
 * An EPUB spine may contain SVG content documents — publishers use them for
 * covers and full-page illustrations, and Japanese light novels routinely do.
 * An SVG document has no `<body>` and no `<head>`, which the reflowable renderer
 * is not built for: it cannot inject the reader's styles into it, and its sizing
 * rules leave the artwork overflowing the page.
 */
export function wrapSvgSections(book: FoliateBook): void {
	for (const section of book.sections) {
		if (!isSvgSection(section)) continue;

		const load = section.load;
		if (!load) continue;
		const unload = section.unload;
		let wrappedUrl: string | null = null;

		const revoke = () => {
			if (wrappedUrl) {
				URL.revokeObjectURL(wrappedUrl);
				wrappedUrl = null;
			}
		};

		section.load = async () => {
			const src = await load.call(section);
			if (typeof src !== "string") return src;

			const wrapped = await wrapSvg(src);
			// Nothing to gain from a half-understood document: hand back the original
			// and let the renderer do what it did before.
			if (!wrapped) return src;

			revoke();
			wrappedUrl = URL.createObjectURL(
				new Blob([wrapped], { type: "application/xhtml+xml" }),
			);
			return wrappedUrl;
		};

		section.unload = () => {
			revoke();
			unload?.call(section);
		};
	}
}

function isSvgSection(section: FoliateSection): boolean {
	return /\.svg$/i.test(section.id ?? "");
}

/** Stops the book from stretching its own artwork out of shape. */
export function keepArtworkAspect(doc: Document): void {
	// `image` here is the SVG element: HTML has no tag by that name.
	for (const el of doc.querySelectorAll("svg, image")) {
		if (/^\s*none\b/i.test(el.getAttribute("preserveAspectRatio") ?? "")) {
			el.removeAttribute("preserveAspectRatio");
		}
	}
}

const WRAPPER_STYLE = `
html, body { margin: 0; padding: 0; height: 100%; }
body { display: flex; align-items: center; justify-content: center; }
svg { display: block; width: 100%; height: 100%; max-width: 100%; max-height: 100%; }
`;

/**
 * `src` is the blob URL foliate-js made for the SVG. Returns the XHTML to show
 * in its place, or null when the file turns out not to be an SVG we understand.
 */
async function wrapSvg(src: string): Promise<string | null> {
	let text: string;
	try {
		text = await (await fetch(src)).text();
	} catch {
		return null;
	}

	const doc = new DOMParser().parseFromString(text, "image/svg+xml");
	const svg = doc.documentElement;
	if (doc.querySelector("parsererror") || svg?.namespaceURI !== SVG_NS)
		return null;

	const viewBox = fitToPage(svg);
	const markup = new XMLSerializer().serializeToString(svg);

	// A fixed-layout book sizes its pages from the SVG's own viewBox, which it can
	// no longer see. Say the same thing the way an XHTML page says it.
	const viewport = viewBox
		? `<meta name="viewport" content="width=${viewBox.width}, height=${viewBox.height}"/>`
		: "";

	return [
		`<?xml version="1.0" encoding="UTF-8"?>`,
		`<html xmlns="${XHTML_NS}">`,
		`<head><meta charset="utf-8"/>${viewport}`,
		`<style>${WRAPPER_STYLE}</style>`,
		stylesheetLinks(doc),
		"</head>",
		`<body>${markup}</body>`,
		"</html>",
	].join("");
}

interface ViewBox {
	width: number;
	height: number;
}

/**
 * Takes the artwork's dimensions off the `<svg>` element and leaves them in the
 * viewBox, so the page decides how big it is drawn and the aspect ratio decides
 * the rest. Returns the viewBox it ended up with, if any.
 */
function fitToPage(svg: Element): ViewBox | null {
	let viewBox = parseViewBox(svg.getAttribute("viewBox"));

	if (!viewBox) {
		// No viewBox: the width and height attributes are the only record of the
		// aspect ratio, so turn them into one before dropping them.
		viewBox = viewBoxFromSize(
			svg.getAttribute("width"),
			svg.getAttribute("height"),
		);
		if (viewBox)
			svg.setAttribute("viewBox", `0 0 ${viewBox.width} ${viewBox.height}`);
	}

	// Without a viewBox there is no aspect ratio to preserve, so the attributes
	// are all the sizing the file has: leave them be.
	if (viewBox) {
		svg.removeAttribute("width");
		svg.removeAttribute("height");
	}

	// `preserveAspectRatio="none"` is not handled here: the SVG ends up inlined in
	// the wrapper, where `keepArtworkAspect` sees it like any other.

	return viewBox;
}

function parseViewBox(value: string | null): ViewBox | null {
	if (!value) return null;
	const parts = value
		.trim()
		.split(/[\s,]+/)
		.map(Number);
	if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
	const [, , width = 0, height = 0] = parts;
	return width > 0 && height > 0 ? { width, height } : null;
}

/** Only a pair in the same unit says anything about the aspect ratio. */
function viewBoxFromSize(
	width: string | null,
	height: string | null,
): ViewBox | null {
	const w = parseLength(width);
	const h = parseLength(height);
	if (!w || !h || w.unit !== h.unit || w.unit === "%") return null;
	return { width: w.value, height: h.value };
}

function parseLength(
	value: string | null,
): { value: number; unit: string } | null {
	const match = /^\s*([\d.]+)\s*([a-z%]*)\s*$/i.exec(value ?? "");
	if (!match) return null;
	const number = Number(match[1]);
	return number > 0
		? { value: number, unit: (match[2] ?? "").toLowerCase() }
		: null;
}

/**
 * An SVG carries its stylesheets in `<?xml-stylesheet?>` instructions, which sit
 * outside the element we inline and would otherwise be lost with it.
 */
function stylesheetLinks(doc: Document): string {
	let links = "";
	for (let node = doc.firstChild; node; node = node.nextSibling) {
		if (node.nodeType !== Node.PROCESSING_INSTRUCTION_NODE) continue;
		const instruction = node as ProcessingInstruction;
		if (instruction.target !== "xml-stylesheet") continue;
		const href = /href\s*=\s*"([^"]*)"|href\s*=\s*'([^']*)'/.exec(
			instruction.data,
		);
		const url = href?.[1] ?? href?.[2];
		if (url) links += `<link rel="stylesheet" href="${escapeAttribute(url)}"/>`;
	}
	return links;
}

function escapeAttribute(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/"/g, "&quot;");
}
