// Getting the book into the browser and open.

import { useEffect, useState } from "react";
import { closeComic } from "@/features/reader/comic-book";
import { heldFile } from "@/features/reader/local-files";
import {
	type BookSource,
	sourceFromFile,
	sourceFromShelf,
} from "@/features/reader/open-book";
import { t } from "@/i18n";

interface BookSourceProps {
	/** A book on a shelf, and the name of its file. */
	book: { id: string; name: string } | null;
	/** A file the reader handed to the browser, by the token its URL carries. */
	file: string | null;
}

interface OpenedBook {
	source: BookSource | null;
	/** What went wrong, for the caller to report and act on. */
	failed: unknown;
}

/**
 * Opens the book. A comic's archive stays open on the server for as long as
 * this hook holds it, so closing it is this hook's to do -- not the view's,
 * which remounts when a setting says to.
 */
export function useBookSource({ book, file }: BookSourceProps): OpenedBook {
	const [source, setSource] = useState<BookSource | null>(null);
	const [failed, setFailed] = useState<unknown>(null);
	const bookId = book?.id ?? null;
	const bookName = book?.name ?? null;

	useEffect(() => {
		if (!bookId && !file) return;
		let cancelled = false;
		/** Set as soon as an archive is open, so a late arrival is still closed. */
		let openedComic: string | null = null;

		const opening = (async (): Promise<BookSource> => {
			if (bookId && bookName) return sourceFromShelf(bookId, bookName);
			const held = file ? heldFile(file) : undefined;
			if (!held) throw new Error(t("reader.fileGone"));
			return sourceFromFile(held);
		})();

		opening
			.then((next) => {
				if (next.kind === "comic") openedComic = next.comic.key;
				if (cancelled) return;
				setSource(next);
			})
			.catch((error: unknown) => {
				if (!cancelled) setFailed(error);
			})
			.finally(() => {
				if (cancelled && openedComic) void closeComic(openedComic);
			});

		return () => {
			cancelled = true;
			if (openedComic) void closeComic(openedComic);
		};
	}, [bookId, bookName, file]);

	return { source, failed };
}
