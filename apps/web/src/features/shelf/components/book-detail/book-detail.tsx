// One book, in full.

import { Button } from "@registrum/ui/components/button";
import { ScrollArea } from "@registrum/ui/components/scroll-area";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@registrum/ui/components/tooltip";
import { useNavigate } from "@tanstack/react-router";
import { BookXIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScreenEmpty } from "@/components/screen-empty";
import { BookDetailAside } from "@/features/shelf/components/book-detail/book-detail-aside";
import { BookDetailMain } from "@/features/shelf/components/book-detail/book-detail-main";
import { BookEditDialog } from "@/features/shelf/components/book-detail/book-edit-dialog";
import {
	SheetHeader,
	SheetLoading,
} from "@/features/shelf/components/sheet-parts";
import { bookLink, readLink } from "@/features/shelf/links";
import { useBook, useShelfBooks } from "@/features/shelf/queries";
import { useShelfStore } from "@/features/shelf/store";
import { type BookRecord, NO_BOOKS } from "@/features/shelf/types";
import { useFormFactor } from "@/hooks/use-form-factor";
import { useWindowTitle } from "@/hooks/use-window-title";

/**
 * One book, in full. The sheet it sits in is its frame. On a desktop the book
 * and its record stand in two columns that scroll apart; on a phone they are
 * one column, read straight down, with the book at the top of it.
 */
export function BookDetail({ id }: { id: string | undefined }) {
	const { t } = useTranslation();
	const wide = useFormFactor() === "desktop";
	const navigate = useNavigate();
	const [editing, setEditing] = useState(false);

	const shelfId = useShelfStore((state) => state.shelfId);
	const hydrated = useShelfStore((state) => state.hydrated);
	const shelf = useShelfBooks().data?.books ?? NO_BOOKS;

	/**
	 * The book itself, which need not be on the shelf: a condition can be hiding
	 * it, and the reader can still have arrived here from a link or a search.
	 */
	const found = useBook(id);

	/** The shelf's own copy stands in until the server answers. */
	const book =
		(found.data?.id === id ? found.data : undefined) ??
		shelf.find((entry) => entry.id === id);

	// The two step buttons walk the shelf in the order the reader put it in.
	const at = book ? shelf.findIndex((entry) => entry.id === book.id) : -1;
	const previous = at > 0 ? shelf[at - 1] : undefined;
	const next = at >= 0 && at < shelf.length - 1 ? shelf[at + 1] : undefined;

	useWindowTitle(book ? `${book.title} — ${t("app.name")}` : t("app.name"));

	const toShelf = useCallback(() => void navigate({ to: "/" }), [navigate]);
	const openBook = useCallback(
		(entry: BookRecord) => void navigate(bookLink(entry.id)),
		[navigate],
	);
	// The reader's own back button returns here, so the way in is named in the
	// URL rather than left to history.
	const readBook = useCallback(
		() => void navigate(readLink(id, "book")),
		[navigate, id],
	);

	// No `screen-pane`: this is the app waking up, not a screen a navigation
	// swaps, and claiming to be one would stretch the transition
	//.
	if (!hydrated || !shelfId || (Boolean(id) && found.isPending && !book)) {
		return <SheetLoading />;
	}

	if (!book) {
		return (
			<ScreenEmpty
				className="w-full"
				icon={<BookXIcon />}
				title={t("detail.notFoundTitle")}
				description={t("detail.notFound")}
			>
				<Button variant="outline" onClick={toShelf}>
					{t("shelf.back")}
				</Button>
			</ScreenEmpty>
		);
	}

	const aside = {
		book,
		onRead: readBook,
		onEdit: () => setEditing(true),
	};
	const record = { book, shelfId, onOpenBook: openBook, onRemoved: toShelf };

	return (
		<>
			<SheetHeader label={book.title} onClose={toShelf}>
				<div className="ml-auto flex shrink-0 items-center gap-1">
					<StepButton book={previous} direction="previous" onOpen={openBook} />
					<StepButton book={next} direction="next" onOpen={openBook} />
					{at >= 0 && (
						<span className="ml-1.5 phone:hidden text-muted-foreground text-xs tabular-nums">
							{at + 1} / {shelf.length}
						</span>
					)}
				</div>
			</SheetHeader>

			{/* Keyed on the book: stepping to the next one is a new page, so it
          starts at the top and its two halves arrive again rather than the
          words changing under a reader halfway down the last one. */}
			{wide ? (
				<div key={book.id} className="flex min-h-0 flex-1">
					{/* The book never scrolls: its cover shrinks to the sheet instead. */}
					<BookDetailAside {...aside} fit />
					{/* `min-w-0`: without it the column is floored at the record's
              min-content width — one long identifier or path widens it past
              the sheet and the right of every row is cut off. */}
					<ScrollArea className="min-h-0 min-w-0 flex-1">
						<div className="pb-[var(--safe-bottom)]">
							<BookDetailMain {...record} />
						</div>
					</ScrollArea>
				</div>
			) : (
				<ScrollArea key={book.id} className="min-h-0 flex-1">
					<div className="flex flex-col pb-[var(--safe-bottom)]">
						<BookDetailAside {...aside} />
						<BookDetailMain {...record} />
					</div>
				</ScrollArea>
			)}

			<BookEditDialog book={book} open={editing} onOpenChange={setEditing} />
		</>
	);
}

/** The next book along the shelf, without going back to it. */
function StepButton({
	book,
	direction,
	onOpen,
}: {
	book: BookRecord | undefined;
	direction: "previous" | "next";
	onOpen: (book: BookRecord) => void;
}) {
	const { t } = useTranslation();
	const label =
		direction === "previous" ? t("detail.previousBook") : t("detail.nextBook");
	const absent =
		direction === "previous" ? t("detail.noPrevious") : t("detail.noNext");

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label={label}
						disabled={!book}
						onClick={() => book && onOpen(book)}
						className="rounded-xl text-muted-foreground"
					>
						{direction === "previous" ? (
							<ChevronLeftIcon />
						) : (
							<ChevronRightIcon />
						)}
					</Button>
				}
			/>
			<TooltipContent side="bottom">
				{book ? book.title : absent}
			</TooltipContent>
		</Tooltip>
	);
}
