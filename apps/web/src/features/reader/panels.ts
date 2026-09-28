// What the reader can have open over the page.

/** The contents, search and bookmarks tabs share one slab; the progress rail,
 *  the display settings and the AI's questions each have their own. */
export type ReaderPanel =
	| "none"
	| "toc"
	| "search"
	| "bookmarks"
	| "progress"
	| "settings"
	| "ai";

/** One that is actually open. */
export type OpenPanel = Exclude<ReaderPanel, "none">;

/** The ones the book panel holds as tabs. */
export type BookTab = Extract<ReaderPanel, "toc" | "search" | "bookmarks">;

export function isBookTab(panel: ReaderPanel): panel is BookTab {
	return panel === "toc" || panel === "search" || panel === "bookmarks";
}
