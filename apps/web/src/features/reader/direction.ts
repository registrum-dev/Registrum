// Which way the pages run, with the reader's flip applied.

import type { BookDir } from "@/features/reader/foliate";

export interface PageDirection {
	vertical: boolean;
	/** True when the next page lies to the left — CJK vertical text and RTL books. */
	nextIsLeft: boolean;
}

export const LTR_DIRECTION: PageDirection = {
	vertical: false,
	nextIsLeft: false,
};

/**
 * Works out which way the pages run from the document as it was actually
 * rendered, so a forced writing mode is reflected as well as the book's own.
 */
function directionFromDoc(doc: Document, bookDir?: BookDir): PageDirection {
	// An SVG content document — legal in an EPUB spine, and common for covers and
	// full-page illustrations — has no `body`.
	const root = doc.body ?? doc.documentElement;
	const style = root ? doc.defaultView?.getComputedStyle(root) : undefined;
	const writingMode = style?.writingMode ?? "horizontal-tb";

	if (writingMode.startsWith("vertical")) {
		// vertical-rl runs right to left; vertical-lr (rare) runs the other way.
		return { vertical: true, nextIsLeft: writingMode !== "vertical-lr" };
	}

	const rtl =
		style?.direction === "rtl" ||
		doc.body?.dir === "rtl" ||
		doc.documentElement?.dir === "rtl" ||
		bookDir === "rtl";
	return { vertical: false, nextIsLeft: rtl };
}

/** The other way round. */
export function opposite(dir: BookDir): BookDir {
	return dir === "rtl" ? "ltr" : "rtl";
}

/** Which way the pages run, with the reader's flip applied. */
export function turnRound(
	doc: Document,
	bookDir: BookDir | undefined,
	reverse: boolean,
	fixedLayout: boolean,
): PageDirection {
	const direction = directionFromDoc(doc, bookDir);
	if (!reverse) return direction;

	if (!fixedLayout && !direction.vertical) {
		const dir = direction.nextIsLeft ? "ltr" : "rtl";
		if (doc.documentElement) doc.documentElement.dir = dir;
		if (doc.body) doc.body.dir = dir;
	}

	return { ...direction, nextIsLeft: !direction.nextIsLeft };
}
