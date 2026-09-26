// A PDF: the page count, and page one drawn.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas } from "@napi-rs/canvas";
import {
	getDocument,
	type PDFDocumentProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs";

import { Failure } from "../failure";
import { type BookRead, bareBook, type ParsedBook } from "./book";
import { trimOrNull } from "./xml";

type RenderParameters = Parameters<PDFPageProxy["render"]>[0];
type PDFPageProxy = Awaited<ReturnType<PDFDocumentProxy["getPage"]>>;

/** The long edge of the render, which is the thumbnail's own: the page is drawn
 *  at the size the thumbnail is stored at, so nothing is resampled twice. */
const RENDER_EDGE = 512;

/** Where pdf.js keeps the fonts and character maps a page may need drawn. */
const PDFJS_DIR = dirname(
	fileURLToPath(import.meta.resolve("pdfjs-dist/package.json")),
);

/** A PDF states its title, authors, subject and language in its XMP and its
 *  Info dictionary, when whoever made it filled them in. What is left empty, or
 *  was filled in by the program rather than a person, falls back to the file
 *  name. The pages are the sections. */
export async function readPdf(
	data: Uint8Array,
	stem: string,
): Promise<BookRead> {
	const task = getDocument({
		data,
		disableFontFace: true,
		verbosity: 0,
		cMapUrl: `${join(PDFJS_DIR, "cmaps")}/`,
		cMapPacked: true,
		standardFontDataUrl: `${join(PDFJS_DIR, "standard_fonts")}/`,
	});
	let document: PDFDocumentProxy;
	try {
		document = await task.promise;
	} catch (error) {
		await task.destroy();
		throw new Failure("readBook", error);
	}

	try {
		const parsed = bareBook(stem, "pdf");
		// Every page is its own spread, the way the reader paginates it.
		parsed.layout = "pre-paginated";
		parsed.sections = document.numPages;
		await describe(document, parsed);
		return {
			parsed,
			cover: document.numPages > 0 ? await draw(document) : null,
		};
	} finally {
		await task.destroy();
	}
}

/** Page one as a PNG, or `null` when it has no size to draw at. */
async function draw(document: PDFDocumentProxy): Promise<Buffer | null> {
	try {
		const page = await document.getPage(1);
		const base = page.getViewport({ scale: 1 });
		const scale = RENDER_EDGE / Math.max(base.width, base.height);
		if (!Number.isFinite(scale) || scale <= 0) return null;
		const viewport = page.getViewport({ scale });

		// The canvas pdf.js itself draws on in Node.
		const canvas = createCanvas(
			Math.ceil(viewport.width),
			Math.ceil(viewport.height),
		);
		const context = canvas.getContext("2d");
		context.fillStyle = "white";
		context.fillRect(0, 0, canvas.width, canvas.height);
		// pdf.js is typed for the browser's canvas; @napi-rs/canvas is the one it
		// stands in for outside a browser.
		await page.render({
			canvas: canvas as unknown as RenderParameters["canvas"],
			canvasContext: context as unknown as RenderParameters["canvasContext"],
			viewport,
		}).promise;
		return canvas.toBuffer("image/png");
	} catch {
		// A cover is a nicety; a page that will not draw leaves the book without.
		return null;
	}
}

/** What the PDF says about itself, written over the bare book wherever it says
 *  something a person meant. The XMP is read first: it is the newer of the two,
 *  and holds the authors as a list rather than one line of text. */
async function describe(
	document: PDFDocumentProxy,
	parsed: ParsedBook,
): Promise<void> {
	let info: Record<string, unknown>;
	let xmp: { get(name: string): unknown } | null;
	try {
		const read = await document.getMetadata();
		info = read.info as Record<string, unknown>;
		xmp = read.metadata;
	} catch {
		// Metadata is a nicety too; a PDF that will not give it keeps its name.
		return;
	}
	const stated = (name: string) => readable(info[name]);
	const described = (name: string) => readable(xmp?.get(name));

	const title = [described("dc:title"), stated("Title")].find(isTitle);
	if (title) parsed.title = title;

	const listed = xmp?.get("dc:creator");
	const creators = Array.isArray(listed)
		? listed.map(readable)
		: (stated("Author")?.split(/\s*[;；、]\s*/) ?? []);
	parsed.authors = [
		...new Set(creators.filter((name): name is string => isAuthor(name))),
	];

	const subject = described("dc:description") ?? stated("Subject");
	if (subject && subject !== parsed.title) parsed.description = subject;

	// The catalog's /Lang, which pdf.js hands over with the Info dictionary.
	parsed.language =
		stated("Language") ?? described("dc:language")?.split(" ")[0] ?? null;
}

/** A value as text a person could read, or `null`: not a string, empty, or
 *  bytes in some other encoding that no rescue below turns into words. */
function readable(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const text = trimOrNull(shiftJis(value) ?? value);
	if (!text) return null;
	// U+FFFD and control characters are what undecodable bytes become.
	if (/[\uFFFD\p{Cc}]/u.test(text)) return null;
	return text;
}

/** An Info string that pdf.js read as PDFDocEncoding but that was written in
 *  Shift_JIS, as many Japanese PDFs are, decoded as what it is. `null` when the
 *  value is not that -- a real accented title, say, or plain ASCII. */
function shiftJis(value: string): string | null {
	// Plain ASCII reads the same in either encoding.
	if (![...value].some((char) => char.charCodeAt(0) > 0x7f)) return null;
	const bytes: number[] = [];
	for (const char of value) {
		const code = char.codePointAt(0) ?? 0;
		const byte = code <= 0xff ? code : PDF_DOC_BYTES.get(code);
		if (byte === undefined) return null;
		bytes.push(byte);
	}
	let decoded: string;
	try {
		decoded = new TextDecoder("shift_jis", { fatal: true }).decode(
			new Uint8Array(bytes),
		);
	} catch {
		return null;
	}
	// A Latin-1 accent can decode as a half-width kana on its own; only
	// double-byte characters are evidence the bytes were Shift_JIS.
	const wide = decoded.match(/[\u3000-\u30FF\u4E00-\u9FFF\uFF01-\uFF5E]/g);
	return wide && wide.length >= 2 ? decoded : null;
}

/** The characters PDFDocEncoding puts at the bytes Latin-1 does not, back to
 *  their bytes -- the same table pdf.js decodes with. */
const PDF_DOC_BYTES = new Map<number, number>(
	[
		[0x18, [0x2d8, 0x2c7, 0x2c6, 0x2d9, 0x2dd, 0x2db, 0x2da, 0x2dc]],
		[
			0x80,
			[
				0x2022, 0x2020, 0x2021, 0x2026, 0x2014, 0x2013, 0x192, 0x2044, 0x2039,
				0x203a, 0x2212, 0x2030, 0x201e, 0x201c, 0x201d, 0x2018, 0x2019, 0x201a,
				0x2122, 0xfb01, 0xfb02, 0x141, 0x152, 0x160, 0x178, 0x17d, 0x131, 0x142,
				0x153, 0x161, 0x17e,
			],
		],
		[0xa0, [0x20ac]],
	].flatMap(([first, chars]) =>
		(chars as number[]).map((char, i): [number, number] => [
			char,
			(first as number) + i,
		]),
	),
);

/** Titles a program writes on its own: the source file's name, with or
 *  without the Office prefix, and the placeholders for none. */
const MADE_UP_TITLE = [
	/^Microsoft (Word|PowerPoint|Excel) - /i,
	/\.(docx?|pptx?|xlsx?|rtf|odt|pages|txt|html?|tex|dvi|ps|eps|indd|qxd|ai|psd|pdf|jpe?g|png|tiff?)$/i,
	/^(untitled|no title|無題|タイトルなし)\b/i,
];

function isTitle(title: string | null): title is string {
	return (
		title !== null &&
		/\p{L}/u.test(title) &&
		!MADE_UP_TITLE.some((pattern) => pattern.test(title))
	);
}

/** Author names a program fills in from the account it runs under. */
const ACCOUNT_NAMES = new Set([
	"admin",
	"administrator",
	"author",
	"default",
	"guest",
	"owner",
	"pc",
	"unknown",
	"user",
	"windows user",
	"microsoft office user",
	"ユーザー",
	"ユーザ",
	"所有者",
	"作成者",
	"不明",
]);

function isAuthor(name: string | null): name is string {
	return (
		name !== null &&
		/\p{L}/u.test(name) &&
		!ACCOUNT_NAMES.has(name.toLowerCase())
	);
}
