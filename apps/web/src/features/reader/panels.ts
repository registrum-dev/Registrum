// What the reader can have open over the page.

/** The contents and search tabs share one slab; the progress rail, the display
 *  settings and the AI's questions each have their own. */
export type ReaderPanel =
	| "none"
	| "toc"
	| "search"
	| "progress"
	| "settings"
	| "ai";

/** One that is actually open. */
export type OpenPanel = Exclude<ReaderPanel, "none">;

/** The two the book panel holds as tabs. */
export type BookTab = Extract<ReaderPanel, "toc" | "search">;
