// The reader.

import { Spinner } from "@registrum/ui/components/spinner";
import { cn } from "@registrum/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Presence } from "@/components/presence";
import { useAiConfigured } from "@/features/ai/queries";
import { hasBookText } from "@/features/ai/types";
import { useKeepSavedRecord, useSavedBook } from "@/features/offline/queries";
import { AiPanel } from "@/features/reader/components/ai-panel";
import { BookPanel } from "@/features/reader/components/book-panel";
import { ChromeBar } from "@/features/reader/components/chrome-bar";
import { ImageViewer } from "@/features/reader/components/image-viewer";
import { ProgressPanel } from "@/features/reader/components/progress-panel";
import { ReaderView } from "@/features/reader/components/reader-view";
import { SettingsPanel } from "@/features/reader/components/settings-panel";
import { LTR_DIRECTION, type PageDirection } from "@/features/reader/direction";
import type { FoliateView, RelocateDetail } from "@/features/reader/foliate";
import { toggleFullscreen } from "@/features/reader/fullscreen";
import { useBookSource } from "@/features/reader/hooks/use-book-source";
import { useBookmarks } from "@/features/reader/hooks/use-bookmarks";
import { useChromeVisibility } from "@/features/reader/hooks/use-chrome-visibility";
import { useLeaveReader } from "@/features/reader/hooks/use-leave-reader";
import { useOpenWatchdog } from "@/features/reader/hooks/use-open-watchdog";
import { useReaderNavigation } from "@/features/reader/hooks/use-reader-navigation";
import { useReaderShortcuts } from "@/features/reader/hooks/use-reader-shortcuts";
import { useReadingPosition } from "@/features/reader/hooks/use-reading-position";
import { heldFile } from "@/features/reader/local-files";
import type { BookInfo } from "@/features/reader/open-view";
import {
	isBookTab,
	type OpenPanel,
	type ReaderPanel,
} from "@/features/reader/panels";
import { useReaderSettings } from "@/features/reader/store";
import { PALETTES } from "@/features/reader/themes";
import { baseName } from "@/features/shelf/paths";
import { useBook } from "@/features/shelf/queries";
import { useShelfStore } from "@/features/shelf/store";
import { useWindowTitle } from "@/hooks/use-window-title";
import { t as translate } from "@/i18n";
import { aboveStyle, useStackLayer } from "@/lib/sheet-stack";
import type { ReaderSearch } from "@/routes/_shelf/read";
import { describeError, showAlert } from "@/store/alert";

/** The reader: one book, filling the window. */
export function ReaderPage({ id, file, from }: ReaderSearch) {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const settings = useReaderSettings((state) => state.settings);
	const shelfId = useShelfStore((state) => state.shelfId);
	const hydrated = useShelfStore((state) => state.hydrated);
	const openFailed = useShelfStore((state) => state.openFailed);

	// Asked of the shelf, not taken off the list on screen: a filter can be hiding it.
	const lookup = useBook(id);
	// Without the server, the record saved with the book stands in for it.
	const saved = useSavedBook(id);
	const offline = openFailed || lookup.isError;
	const book = (offline ? saved.data?.record : lookup.data) ?? undefined;
	/** Until the shelf has answered, "no book yet" is not "no such book". */
	const looking = Boolean(id) && (offline ? saved.isLoading : lookup.isPending);
	useKeepSavedRecord(lookup.data, shelfId);

	const bookId = book?.id ?? null;
	/** A book on the shelf, from this browser's copy or else the server. */
	const shelved =
		book && shelfId
			? {
					id: book.id,
					name: baseName(book.path),
					size: book.size,
					mtime: book.mtime,
				}
			: null;
	/** A file handed to the browser, which is what is opened when no book is. */
	const handed = shelved ? null : (file ?? null);
	/** What the title falls back to before the book has said its own. */
	const fileName =
		shelved?.name ?? (handed ? (heldFile(handed)?.name ?? null) : null);
	const opening = Boolean(shelved || handed);

	// Asking is offered for a book the shelf holds, whose words can be read,
	// once an endpoint has been named.
	const aiConfigured = useAiConfigured();
	const canAsk =
		Boolean(book && shelfId && hasBookText(book.format)) && aiConfigured;

	const [info, setInfo] = useState<BookInfo | null>(null);
	const [direction, setDirection] = useState<PageDirection>(LTR_DIRECTION);
	const [relocation, setRelocation] = useState<RelocateDetail | null>(null);
	const [panel, setPanel] = useState<ReaderPanel>("none");
	const [loading, setLoading] = useState(true);
	/** The picture opened up from the page, if any. */
	const [zoomed, setZoomed] = useState<string | null>(null);

	const [view, setView] = useState<FoliateView | null>(null);

	const { source, failed } = useBookSource({ book: shelved, file: handed });
	const { record, lastCfi } = useReadingPosition(bookId);
	const bookmarks = useBookmarks(shelfId, bookId, relocation);

	const { visible: chromeVisible, toggle: toggleChrome } = useChromeVisibility(
		panel !== "none" || !source || loading,
	);

	// The reader is laid over the screen it was opened from, and leaves by
	// sliding down off it.
	const { page, leave, drag, goBack } = useLeaveReader({ id, from });
	// The asking sheet steps the page back the way the book's sheet steps back the shelf.
	const { above } = useStackLayer(null);

	// Waits on hydration and on the lookup: until both are done every id looks
	// unknown.
	useEffect(() => {
		if (opening || (id && (!hydrated || looking))) return;
		if (id)
			showAlert(translate(offline ? "offline.notSaved" : "reader.notOnShelf"));
		else if (file) showAlert(translate("reader.fileGone"));
		void navigate({ to: "/", replace: true });
	}, [opening, hydrated, looking, offline, id, file, navigate]);

	// A file on its way is a book to wait for.
	const [wasOpening, setWasOpening] = useState(opening);
	if (opening !== wasOpening) {
		setWasOpening(opening);
		if (opening) setLoading(true);
	}

	useEffect(() => {
		if (failed === null) return;
		setLoading(false);
		showAlert(
			translate("reader.readFailed", { message: describeError(failed) }),
		);
		void navigate({ to: "/", replace: true });
	}, [failed, navigate]);

	useOpenWatchdog(loading, (message) => {
		setLoading(false);
		showAlert(message);
	});

	// The shelf's title wins over the book's own: it is the one shown there,
	// and for a CBZ the book's own is just the file name with its extension.
	const title = book?.title ?? info?.title ?? fileName ?? t("app.name");

	useWindowTitle(`${title} — ${t("app.name")}`);

	const navigation = useReaderNavigation(view, direction);
	const { goLeft, goRight } = navigation;

	const togglePanel = useCallback((next: OpenPanel) => {
		setPanel((current) => (current === next ? "none" : next));
	}, []);

	const canSearch = source !== null && source.kind !== "comic";
	const hasToc = Boolean(info?.toc.length);

	useReaderShortcuts({
		source,
		canSearch,
		hasToc,
		panel,
		actions: {
			...navigation,
			setPanel,
			togglePanel,
			toggleBookmark: bookmarks.toggle,
		},
	});

	// Everything foliate-js can only read while a book is opened: which book it
	// is, and the two settings that reach it on the way in. Any of them changing
	// rebuilds the view from scratch, which is what keeps a book handed to an
	// open reader from inheriting the last one's place.
	// Which book it is comes from the search rather than the lookup: the search
	// changes once per book, where the lookup can answer twice for the same one.
	const readerKey = `${id ?? file}:${settings.reverseDirection}:${settings.spread}`;

	const invertPages =
		Boolean(info?.isFixedLayout) &&
		settings.theme === "dark" &&
		settings.invertFixed;

	return (
		// One box to rise over the shelf.
		<div
			style={aboveStyle(above)}
			className={cn(
				"absolute inset-0 z-30 overflow-hidden",
				above && "screen-stepped",
			)}
		>
			<div
				ref={page}
				className="absolute inset-0 overflow-hidden bg-background shadow-[0_-8px_40px_rgb(0_0_0/0.25)]"
			>
				{/* The page is inset by whatever the phone's own bars cover: text under a
            status bar is text that cannot be read. The inset edges wear the book's
            own paper, so they read as part of the book rather than as the app
            behind it. */}
				<main
					// One crossfade with the veil, so both sides take the arriving length
					//.
					className={cn(
						"absolute inset-0 transition-opacity duration-[var(--dur-slow)] ease-enter",
						loading && "opacity-0",
						invertPages && "invert-pages",
					)}
					style={{
						background: PALETTES[settings.theme].bg,
						paddingTop: "var(--safe-top)",
						paddingBottom: "var(--safe-bottom)",
						paddingLeft: "var(--safe-left)",
						paddingRight: "var(--safe-right)",
					}}
				>
					{source && (
						// What shows around a fixed-layout page, which is not the paper the
						// edges wear (src/app/index.css).
						<div className="h-full w-full bg-background">
							<ReaderView
								key={readerKey}
								source={source}
								// Where this book was last left, until a relocation supersedes it.
								initialLocation={lastCfi.current ?? book?.position?.cfi}
								onReady={(opened, bookInfo) => {
									setView(opened);
									setInfo(bookInfo);
									setLoading(false);
								}}
								onClosed={() => {
									setView(null);
									setZoomed(null);
									setLoading(true);
								}}
								onRelocate={(detail) => {
									record(detail);
									setRelocation(detail);
								}}
								onTap={() => {
									// Outside the panel is the page, and the phone's dialog has a
									// scrim of its own:
									if (panel !== "none") {
										setPanel("none");
										return;
									}
									toggleChrome();
								}}
								onZoom={setZoomed}
								onTurn={(side) => (side === "left" ? goLeft() : goRight())}
								onPull={(distance) => drag.pull(distance)}
								onPullEnd={(end) => {
									if (end === "cancelled") drag.cancel();
									else drag.release();
								}}
								onDirectionChange={setDirection}
								onError={(message) => {
									setLoading(false);
									showAlert(message);
									goBack();
								}}
							/>
						</div>
					)}
				</main>

				<ChromeBar
					title={title}
					visible={chromeVisible}
					hasToc={hasToc}
					canSearch={canSearch}
					canAsk={canAsk}
					canBookmark={bookmarks.enabled}
					bookmarked={bookmarks.marked}
					panel={panel}
					fraction={relocation?.fraction ?? 0}
					onTogglePanel={togglePanel}
					onToggleBookmark={bookmarks.toggle}
					onCloseBook={() => leave()}
				/>

				<BookPanel
					open={isBookTab(panel)}
					tab={isBookTab(panel) ? panel : "toc"}
					onTabChange={setPanel}
					toc={info?.toc ?? []}
					activeLabel={relocation?.tocItem?.label}
					hasToc={hasToc}
					canSearch={canSearch}
					bookmarks={bookmarks.enabled ? bookmarks.marks : null}
					onRemoveBookmark={bookmarks.remove}
					view={view}
					onNavigate={(target) => void view?.goTo(target)}
					onClose={() => setPanel("none")}
				/>

				<ProgressPanel
					open={panel === "progress"}
					fraction={relocation?.fraction ?? 0}
					onSeek={(fraction) => void view?.goToFraction(fraction)}
					onClose={() => setPanel("none")}
				/>

				{canAsk && bookId && shelfId && (
					<AiPanel
						open={panel === "ai"}
						shelfId={shelfId}
						bookId={bookId}
						at={relocation?.section?.current ?? null}
						onClose={() => setPanel("none")}
					/>
				)}

				<SettingsPanel
					open={panel === "settings"}
					isFixedLayout={Boolean(info?.isFixedLayout)}
					direction={direction}
					onToggleFullscreen={() => void toggleFullscreen()}
					onClose={() => setPanel("none")}
				/>

				<Presence>
					{zoomed && (
						<ImageViewer
							key={zoomed}
							src={zoomed}
							onClose={() => setZoomed(null)}
						/>
					)}
				</Presence>

				<Presence>
					{loading && (
						<div
							key="veil"
							className="chrome absolute inset-0 z-40 flex animate-[arrive-fade_var(--dur-standard)_var(--ease-enter)_backwards] items-center justify-center bg-background/70 backdrop-blur-sm data-leaving:animate-[leave-fade_var(--dur-slow)_var(--ease-exit)_forwards]"
						>
							{/* The veil is up either way: the page underneath is not drawn
                  yet, and fading in an unfinished one is worse than a blank
. */}
							<Spinner aria-label={t("common.loading")} />
						</div>
					)}
				</Presence>
			</div>
		</div>
	);
}
