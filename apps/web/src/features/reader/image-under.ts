// Which picture in the book a press landed on.

const XLINK_NS = "http://www.w3.org/1999/xlink";

/** Smaller than this both ways is a glyph drawn as an image, not a picture (px). */
const MIN_SIDE = 64;

/**
 * The URL of the picture under `target`, or null. The book's documents live in
 * iframes, so elements are told apart by name rather than by `instanceof`.
 */
export function imageUnder(target: EventTarget | null): string | null {
	const el = target as Element | null;
	if (typeof el?.closest !== "function") return null;

	const img = el.closest("img") as HTMLImageElement | null;
	if (img) return bigEnough(img) ? img.currentSrc || img.src || null : null;

	// A full-page illustration is often an `<image>` inside an `<svg>`, and the
	// press lands on either.
	const svg = el.closest("svg");
	if (!svg) return null;
	const image =
		el.localName === "image" ? el : onlyImage(svg.querySelectorAll("image"));
	if (!image || !bigEnough(image)) return null;
	const href =
		image.getAttribute("href") ?? image.getAttributeNS(XLINK_NS, "href");
	if (!href) return null;
	try {
		return new URL(href, image.ownerDocument.baseURI).href;
	} catch {
		return href;
	}
}

function onlyImage(images: NodeListOf<Element>): Element | null {
	return images.length === 1 ? (images[0] ?? null) : null;
}

function bigEnough(el: Element): boolean {
	const { width, height } = el.getBoundingClientRect();
	return width >= MIN_SIDE || height >= MIN_SIDE;
}
