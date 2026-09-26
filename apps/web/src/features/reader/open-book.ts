// Handing a book file to foliate-js.

import { bookFileUrl } from "@/features/library/ipc";
import { BOOK_FORMATS, isComicFormat } from "@/features/library/types";
import { type ComicBook, openComic } from "@/features/reader/comic-book";
import type { FoliateBook } from "@/features/reader/foliate";
import { t } from "@/i18n";

const MIME_TYPES: Record<string, string> = {
	epub: "application/epub+zip",
	pdf: "application/pdf",
	cbz: "application/vnd.comicbook+zip",
	// foliate-js reads a zip as a comic only when the type or the name says so,
	// and a `.zip` name says nothing.
	zip: "application/vnd.comicbook+zip",
};

function extensionOf(pathOrName: string): string {
	const match = /\.([^.\\/]+)$/.exec(pathOrName);
	return match?.[1]?.toLowerCase() ?? "";
}

export function isSupportedPath(pathOrName: string): boolean {
	return (BOOK_FORMATS as readonly string[]).includes(extensionOf(pathOrName));
}

/**
 * Where the book's content comes from. A comic archive on a shelf stays on the
 * server and gives up one page at a time; everything else is read whole,
 * because foliate-js parses it here.
 */
export type BookSource =
	| { readonly kind: "bytes"; readonly name: string; readonly bytes: File }
	| {
			readonly kind: "comic";
			readonly name: string;
			readonly comic: ComicBook;
	  };

/** The same file, typed the way foliate-js recognises its format. */
function typed(file: Blob, name: string): File {
	const type = MIME_TYPES[extensionOf(name)] ?? file.type;
	return new File([file], name, { type });
}

/** A file the reader handed to the browser directly. */
export function sourceFromFile(file: File): BookSource {
	return { kind: "bytes", name: file.name, bytes: typed(file, file.name) };
}

/** A book on a shelf: the archive on the server for a comic, the bytes here otherwise. */
export async function sourceFromLibrary(
	id: string,
	name: string,
): Promise<BookSource> {
	if (isComicFormat(extensionOf(name))) {
		return { kind: "comic", name, comic: await openComic(id) };
	}
	const response = await fetch(bookFileUrl(id), { credentials: "same-origin" });
	if (!response.ok)
		throw new Error(t("reader.fetchFailed", { status: response.status }));
	return { kind: "bytes", name, bytes: typed(await response.blob(), name) };
}

/** Asks the reader for a book file of their own, through the browser's picker. */
export function pickBookFile(): Promise<File | null> {
	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = BOOK_FORMATS.map((format) => `.${format}`).join(",");
		input.addEventListener("change", () => resolve(input.files?.[0] ?? null), {
			once: true,
		});
		input.addEventListener("cancel", () => resolve(null), { once: true });
		input.click();
	});
}

/** `metadata.title` is either a plain string or a language-keyed map. */
export function bookTitle(book: FoliateBook, fallback: string): string {
	const title = book.metadata?.title;
	if (typeof title === "string" && title.trim()) return title;
	if (title && typeof title === "object") {
		const first = Object.values(title).find(
			(value) => typeof value === "string" && value.trim(),
		);
		if (first) return first;
	}
	return fallback;
}
