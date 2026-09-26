// Putting one book into a `<foliate-view>`, in the order foliate-js needs.

import { makeComicBook } from "@/features/reader/comic-book";
import { buildContentCss } from "@/features/reader/content-css";
import {
	opposite,
	type PageDirection,
	turnRound,
} from "@/features/reader/direction";
import type {
	BookDir,
	FoliateBook,
	FoliateView,
	LoadDetail,
	LoadItemDetail,
	RelocateDetail,
	TocItem,
} from "@/features/reader/foliate";
import { loadFoliate } from "@/features/reader/foliate-loader";
import { type BookSource, bookTitle } from "@/features/reader/open-book";
import {
	attachPageGestures,
	type PageGestureHandlers,
} from "@/features/reader/page-gestures";
import { marginPreset, type Settings } from "@/features/reader/settings";
import {
	keepArtworkAspect,
	wrapSvgSections,
} from "@/features/reader/svg-sections";
import { t } from "@/i18n";
import { errorText } from "@/store/alert";

export interface BookInfo {
	title: string;
	toc: TocItem[];
	isFixedLayout: boolean;
}

/**
 * What the open fills in as it goes. A section load can arrive before the open
 * has finished, and a teardown can land between any two of its awaits; both
 * read this rather than the finished handle below.
 */
export interface Opening {
	book: FoliateBook | null;
	view: FoliateView | null;
	/** Which way the book runs of its own accord, before any reversal. */
	natural: BookDir | undefined;
	/** Whether the reader has asked for that to be turned round. */
	reversed: boolean;
}

function startOpening(): Opening {
	return { book: null, view: null, natural: undefined, reversed: false };
}

export interface OpenedView {
	view: FoliateView;
	info: BookInfo;
}

export interface OpenViewOptions {
	source: BookSource;
	/** The element the view is appended to. */
	host: HTMLElement;
	/** A CFI: where this book was last left. */
	openAt: string | undefined;
	/** Read once the book has been parsed, which is when they first matter. */
	settings: () => Settings;
	/** True once the caller has torn down. Checked after every await. */
	disposed: () => boolean;
	onLoad: (event: Event) => void;
	onRelocate: (event: Event) => void;
}

/** Opens the book and hands back the view, or nothing if the caller has left. */
async function openView(
	{
		source,
		host,
		openAt,
		settings,
		disposed,
		onLoad,
		onRelocate,
	}: OpenViewOptions,
	opening: Opening,
): Promise<OpenedView | null> {
	const isComic = source.kind === "comic";
	// Loaded either way: it is what defines `<foliate-view>`.
	const { makeBook } = await loadFoliate();
	const book = isComic
		? makeComicBook(source.comic, source.name)
		: await makeBook(source.bytes);
	refuseScripts(book);
	opening.book = book;
	if (disposed()) {
		book.destroy?.();
		return null;
	}

	const current = settings();
	opening.reversed = current.reverseDirection;
	// A comic archive declares no direction, and most are read right to left.
	opening.natural =
		(isComic ? "rtl" : book.dir) ??
		(book.rendition?.layout === "pre-paginated" ? "ltr" : undefined);
	if (opening.natural) {
		book.dir = opening.reversed ? opposite(opening.natural) : opening.natural;
	}

	wrapSvgSections(book);

	// Read while opening; setting it on the renderer afterwards is too late.
	if (book.rendition?.layout === "pre-paginated") {
		book.rendition = {
			...book.rendition,
			spread: current.spread ? "both" : "none",
		};
	}

	const view = document.createElement("foliate-view") as FoliateView;
	opening.view = view;
	view.setAttribute("autohide-cursor", "");
	view.className = "block h-full w-full";
	view.addEventListener("load", onLoad);
	view.addEventListener("relocate", onRelocate);
	host.append(view);

	await view.open(book);
	if (disposed()) return null;

	applyRendererSettings(view, current);

	// A CFI, not the relocate `fraction`: that one marks the *end* of the
	// current page, so restoring from it would skip a page each time.
	await view.init(openAt ? { lastLocation: openAt } : {});
	if (disposed()) return null;

	return {
		view,
		info: {
			title: bookTitle(book, source.name),
			// A comic archive's "contents" is a page list.
			toc: isComic ? [] : (book.toc ?? []),
			isFixedLayout: view.isFixedLayout,
		},
	};
}

/**
 * Refuses the book's own scripts before the loader fetches them.
 */
function refuseScripts(book: FoliateBook): void {
	book.transformTarget?.addEventListener("load", (event) => {
		const detail = (event as CustomEvent<LoadItemDetail>).detail;
		if (detail.isScript) detail.allow = false;
	});
}

export function applyRendererSettings(view: FoliateView, settings: Settings) {
	const renderer = view.renderer;
	if (!renderer) return;

	if (view.isFixedLayout) {
		// The only knob that takes effect after opening; spread is fixed at open
		// time, which is why it forces a remount.
		renderer.setAttribute("zoom", settings.fitMode);
		return;
	}

	const { maxInlineSize, gap, margin } = marginPreset(settings);
	renderer.setAttribute("flow", settings.flow);
	renderer.setAttribute("gap", `${gap}%`);
	renderer.setAttribute("margin", `${margin}px`);
	renderer.setAttribute("max-inline-size", `${maxInlineSize}px`);
	renderer.setAttribute("max-column-count", String(settings.maxColumnCount));
	renderer.setStyles?.(buildContentCss(settings));

	// `gap` and `margin` only set a custom property; nothing re-runs layout for
	// them the way `max-inline-size` does.
	if (renderer.getContents?.().length) renderer.render?.();
}

/** What a mounted book reports to, read afresh each time rather than once at mount. */
export interface MountCallbacks {
	settings: Settings;
	onReady: (view: FoliateView, info: BookInfo) => void;
	/** The view handed to `onReady` is closed and must not be asked anything. */
	onClosed: () => void;
	onRelocate: (detail: RelocateDetail) => void;
	/**
	 * A plain tap on the page — not a drag, a selection or a link. The book
	 * renders in an iframe, so this cannot be an element laid over the page:
	 * one would take the text underneath out of reach.
	 */
	onTap: () => void;
	/**
	 * A tap near one edge or a sideways swipe. Physical sides, not next and
	 * previous: which of the two goes forward is the book's business.
	 */
	onTurn: (side: "left" | "right") => void;
	/** A downward drag on the page, as it goes and as it ends. */
	onPull: PageGestureHandlers["onPull"];
	onPullEnd: PageGestureHandlers["onPullEnd"];
	onDirectionChange: (direction: PageDirection) => void;
	onError: (message: string) => void;
}

export interface MountOptions {
	source: BookSource;
	/** A CFI: where this book was last left. */
	openAt: string | undefined;
	latest: () => MountCallbacks;
}

export interface MountedBook {
	/** The view once it has been handed to `onReady`, until disposed. */
	view: () => FoliateView | null;
	dispose: () => void;
}

/** Opens `source` into `host` with the page's gestures, until disposed. */
export function mountBook(
	host: HTMLElement,
	{ source, openAt, latest }: MountOptions,
): MountedBook {
	let disposed = false;
	let ready: FoliateView | null = null;
	const opening = startOpening();

	const handleLoad = (event: Event) => {
		const { doc } = (event as CustomEvent<LoadDetail>).detail;
		keepArtworkAspect(doc);
		latest().onDirectionChange(
			turnRound(
				doc,
				opening.natural,
				opening.reversed,
				Boolean(opening.view?.isFixedLayout),
			),
		);
		// The book is in an iframe, so its events have to be relayed out. The
		// listeners die with the document.
		doc.addEventListener("keydown", relayKey);
		gestures.bindDocument(doc);
	};

	const handleRelocate = (event: Event) => {
		latest().onRelocate((event as CustomEvent<RelocateDetail>).detail);
	};

	const gestures = attachPageGestures(host, {
		canTurn: () => {
			const { flow, fitMode } = latest().settings;
			return opening.view?.isFixedLayout
				? fitMode === "fit-page"
				: flow === "paginated";
		},
		onTap: () => latest().onTap(),
		onTurn: (side) => latest().onTurn(side),
		onPull: (distance) => latest().onPull(distance),
		onPullEnd: (end) => latest().onPullEnd(end),
		turnPage: (forward) =>
			void (forward ? opening.view?.next() : opening.view?.prev()),
	});

	void (async () => {
		try {
			const opened = await openView(
				{
					source,
					host,
					openAt,
					settings: () => latest().settings,
					disposed: () => disposed,
					onLoad: handleLoad,
					onRelocate: handleRelocate,
				},
				opening,
			);
			if (!opened) return;

			ready = opened.view;
			latest().onReady(opened.view, opened.info);
		} catch (error) {
			if (!disposed) latest().onError(openFailureMessage(error, source.name));
		}
	})();

	return {
		view: () => ready,
		dispose() {
			disposed = true;
			if (ready) latest().onClosed();
			ready = null;
			gestures.detach();
			opening.view?.removeEventListener("load", handleLoad);
			opening.view?.removeEventListener("relocate", handleRelocate);
			opening.view?.close();
			opening.view?.remove();
			opening.book?.destroy?.();
		},
	};
}

function relayKey(event: KeyboardEvent) {
	const relayed = new KeyboardEvent("keydown", {
		key: event.key,
		code: event.code,
		ctrlKey: event.ctrlKey,
		shiftKey: event.shiftKey,
		altKey: event.altKey,
		metaKey: event.metaKey,
		repeat: event.repeat,
		cancelable: true,
	});
	if (!window.dispatchEvent(relayed)) event.preventDefault();
}

function openFailureMessage(error: unknown, fileName: string): string {
	const detail = errorText(error);
	if (/not supported/i.test(detail))
		return t("reader.unsupportedFile", { file: fileName });
	return t("reader.openFailed", { file: fileName, message: detail });
}
