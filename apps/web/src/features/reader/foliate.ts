// Hand-written types for the parts of foliate-js this app uses; the library ships
// none. See public/foliate-js/FOLIATE_JS_COMMIT.txt.

export type BookDir = "ltr" | "rtl";

export interface TocItem {
	label: string;
	href?: string;
	subitems?: TocItem[] | null;
}

/** A name that may be plain, or keyed by language (EPUB 3 alternate scripts). */
export type LanguageMap = string | Record<string, string>;

export interface BookMetadata {
	title?: LanguageMap;
	subtitle?: LanguageMap;
	/** EPUB gives `{ name, sortAs, role }` objects; the PDF adapter gives a string. */
	author?: unknown;
	publisher?: unknown;
	language?: string | string[];
	published?: unknown;
	identifier?: unknown;
	description?: unknown;
	/** `dc:subject`, as contributor-shaped objects. */
	subject?: unknown;
	/**
	 * EPUB 3 collections. `series` is an array of `{ name, position }`, except
	 * when it came from Calibre's legacy `<meta>` pair, where it is one object.
	 */
	belongsTo?: { series?: unknown; collection?: unknown };
}

export interface FoliateSection {
	/** The manifest href, e.g. `a_1_1.svg`. */
	id?: string;
	load?: () => string | Promise<string>;
	unload?: () => void;
	createDocument?: () => Promise<Document>;
	mediaOverlay?: unknown;
	/** What this section is worth on the progress rail, in the book's own units. */
	size?: number;
}

/**
 * What the EPUB loader asks about before it fetches a manifest item. Setting
 * `allow` to false drops the item and the reference to it.
 */
export interface LoadItemDetail {
	type?: string;
	isScript?: boolean;
	allow: boolean;
}

export interface FoliateBook {
	metadata?: BookMetadata;
	/**
	 * Where the EPUB loader announces each manifest item before loading it. The
	 * comic and PDF adapters have none.
	 */
	transformTarget?: EventTarget;
	/** Page progression direction. `comic-book.js` leaves this unset. */
	dir?: BookDir;
	toc?: TocItem[] | null;
	sections: FoliateSection[];
	rendition?: { layout?: string; spread?: string; viewport?: unknown };
	/** Present on all three adapters; resolves to null when the book has no cover. */
	getCover?: () => Promise<Blob | null> | Blob | null;
	destroy?: () => void;
	/**
	 * The three an adapter provides so that the view can follow a link and place
	 * the progress rail. `splitTOCHref` and `getTOCFragment` have to be there
	 * together, or the rail is never built.
	 */
	resolveHref?: (href: string) => { index: number };
	splitTOCHref?: (href: string) => [string, string | null];
	getTOCFragment?: (doc: Document) => Element;
}

export interface RendererContent {
	doc: Document;
	index: number;
}

export interface FoliateRenderer extends HTMLElement {
	/**
	 * A single string is appended after the book's own stylesheets (wins on ties);
	 * a `[before, after]` pair also prepends one that the book can override.
	 * Only the reflowable renderer (`foliate-paginator`) implements this — the
	 * fixed-layout renderer used for PDF and CBZ does not.
	 */
	setStyles?: (styles: string | [string, string]) => void;
	getContents: () => RendererContent[];
	/** Re-runs layout. Reflowable renderer only; attribute changes do not always trigger it. */
	render?: () => void;
	next: (distance?: number) => Promise<void>;
	prev: (distance?: number) => Promise<void>;
}

export interface RelocateDetail {
	fraction?: number;
	section?: { current: number; total: number };
	location?: { current: number; next: number; total: number };
	tocItem?: TocItem | null;
	pageItem?: TocItem | null;
	cfi?: string;
}

export interface LoadDetail {
	doc: Document;
	index: number;
}

export interface SearchMatch {
	cfi: string;
	excerpt: { pre: string; match: string; post: string };
}

export type SearchYield =
	| "done"
	| { progress: number }
	| { label: string; subitems: SearchMatch[] }
	| SearchMatch;

export interface FoliateView extends HTMLElement {
	book: FoliateBook;
	renderer: FoliateRenderer;
	isFixedLayout: boolean;
	open: (book: Blob | FoliateBook) => Promise<void>;
	close: () => void;
	init: (opts: {
		lastLocation?: unknown;
		showTextStart?: boolean;
	}) => Promise<void>;
	goTo: (target: unknown) => Promise<unknown>;
	goToFraction: (fraction: number) => Promise<void>;
	next: (distance?: number) => Promise<void>;
	prev: (distance?: number) => Promise<void>;
	search: (opts: {
		query: string;
		index?: number;
		matchCase?: boolean;
		matchDiacritics?: boolean;
		matchWholeWords?: boolean;
	}) => AsyncGenerator<SearchYield, void, void>;
	clearSearch: () => void;
	getSectionFractions: () => number[];
}

export interface FoliateModule {
	makeBook: (file: Blob) => Promise<FoliateBook>;
	UnsupportedTypeError: ErrorConstructor;
}
