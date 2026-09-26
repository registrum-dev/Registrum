// A comic archive as foliate-js reads it, with the server holding the archive
// and handing out one page at a time.

import type { ComicBook } from "@registrum/api/types";
import type { FoliateBook } from "@/features/reader/foliate";
import { api } from "@/lib/api";

export type { ComicBook };

/** Opens the archive on the server and takes back its pages, in reading order. */
export function openComic(id: string): Promise<ComicBook> {
	return api.book.openComic.mutate({ id });
}

/** Lets that archive go. A key already replaced closes nothing. */
export async function closeComic(key: string): Promise<void> {
	await api.book.closeComic.mutate({ key });
}

/**
 * What the page's `<img>` points at. The page is fetched here, where the
 * sign-in cookie goes along, and handed over as a blob: Safari does not let an
 * `<img>` inside the blob document reach the server itself.
 */
async function imageSrc(key: string, page: number): Promise<string> {
	const response = await fetch(
		`/api/comics/${encodeURIComponent(key)}/${page}`,
		{
			credentials: "same-origin",
		},
	);
	if (!response.ok) throw new Error(`page ${page}: ${response.status}`);
	return URL.createObjectURL(await response.blob());
}

/** The blob URLs one page is made of, which go when the page goes. */
interface HeldPage {
	page: string;
	image: string;
}

function release(held: HeldPage): void {
	URL.revokeObjectURL(held.page);
	URL.revokeObjectURL(held.image);
}

/**
 * The shape `public/foliate-js/comic-book.js` builds, with each page's bytes
 * replaced by a URL the renderer fetches when it reaches that page.
 */
export function makeComicBook(comic: ComicBook, name: string): FoliateBook {
	const held = new Map<number, HeldPage>();
	const loading = new Map<number, Promise<string>>();

	const make = async (index: number): Promise<string> => {
		const image = await imageSrc(comic.key, index);
		const page = URL.createObjectURL(
			new Blob(
				[
					'<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
						`<body style="margin: 0"><img src="${image}"></body></html>`,
				],
				{ type: "text/html" },
			),
		);
		held.set(index, { page, image });
		return page;
	};

	const load = (index: number): Promise<string> => {
		const page = held.get(index)?.page;
		if (page) return Promise.resolve(page);
		let pending = loading.get(index);
		if (!pending) {
			pending = make(index).finally(() => loading.delete(index));
			loading.set(index, pending);
		}
		return pending;
	};

	const unload = (index: number): void => {
		const page = held.get(index);
		if (!page) return;
		release(page);
		held.delete(index);
	};

	return {
		metadata: { title: name },
		sections: comic.pages.map((page, index) => ({
			id: page,
			load: () => load(index),
			unload: () => unload(index),
			// A page weighs a page. The archive's own byte sizes would make the rail
			// run fast through heavy artwork;
			size: 1,
		})),
		toc: comic.pages.map((page) => ({ label: page, href: page })),
		rendition: { layout: "pre-paginated" },
		resolveHref: (href) => ({ index: comic.pages.indexOf(href) }),
		splitTOCHref: (href) => [href, null],
		getTOCFragment: (doc) => doc.documentElement,
		destroy: () => {
			for (const page of held.values()) release(page);
			held.clear();
		},
	};
}
