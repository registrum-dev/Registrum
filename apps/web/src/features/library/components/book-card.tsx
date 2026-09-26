// One book on the shelf.

import { Button } from "@Registrum/ui/components/button";
import { Progress } from "@Registrum/ui/components/progress";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@Registrum/ui/components/tooltip";
import { cn } from "@Registrum/ui/lib/utils";
import { BookOpenIcon, FileQuestionIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	authorsLabel,
	bookmarkLabel,
	statusLabel,
} from "@/features/library/labels";
import { type BookRecord, progressPercent } from "@/features/library/types";
import { BookCover } from "./book-cover";
import { FavoriteMark, RatingMark } from "./book-marks";

interface BookCardProps {
	book: BookRecord;
	/** Where on the shelf it stands, which is when it arrives. */
	at?: number;
	/** The detail screen — what the card itself is a way into. */
	onOpen: () => void;
	/** Straight into the reader, skipping the detail screen. */
	onRead: () => void;
}

/** One book on the shelf: its cover, what it is, and how far in the reader got. */
export function BookCard({ book, at = 0, onOpen, onRead }: BookCardProps) {
	const { t } = useTranslation();
	const percent = progressPercent(book);
	const started = percent > 0;
	const finished = book.status === "finished";
	const chapter = bookmarkLabel(book);

	return (
		/*
		 * The lift is the wrapper's, so the button below keeps its own transition
		 * to colour alone: two owners of one `translate` is one of them losing.
		 */
		<div
			className={cn(
				"motion-rise group relative [--step:25ms]",
				"transition-[translate,scale] duration-[var(--dur-quick)] ease-standard hover:-translate-y-[3px] active:scale-[0.985]",
			)}
			style={{ "--i": at } as React.CSSProperties}
		>
			<button
				type="button"
				onClick={onOpen}
				title={book.path}
				className={cn(
					"flex w-full flex-col gap-2.5 rounded-xl p-2 text-left",
					"transition-colors duration-[var(--dur-quick)] ease-standard",
					"hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
					book.missing && "opacity-55",
				)}
			>
				<div className="relative w-full">
					<BookCover
						book={book}
						className="w-full shadow-[var(--shadow-chrome)]"
					/>

					{/* Both badges sit on the left; the right-hand corner belongs to the
              button that appears on hover. */}
					<div className="absolute top-1.5 left-1.5 flex items-center gap-1">
						<span className="rounded-md bg-background/85 px-1.5 py-0.5 font-semibold text-[10px] text-muted-foreground uppercase tracking-widest backdrop-blur-sm">
							{book.format}
						</span>
						{book.favorite && (
							<span className="flex items-center rounded-md bg-background/85 px-1.5 py-1 backdrop-blur-sm">
								<FavoriteMark />
							</span>
						)}
					</div>

					{/* The bar sits on the cover rather than under the title: it belongs to
              the book as an object, and it keeps every card the same height. */}
					{started && !book.missing && (
						<div className="absolute inset-x-0 bottom-0">
							{finished ? (
								<div className="flex justify-end p-1.5">
									<span className="rounded-md bg-primary px-1.5 py-0.5 font-semibold text-[10px] text-primary-foreground">
										{t("status.finished")}
									</span>
								</div>
							) : (
								<Progress
									value={percent}
									className="*:data-[slot=progress-track]:rounded-none *:data-[slot=progress-track]:bg-background/40"
								/>
							)}
						</div>
					)}
				</div>

				<div className="flex min-w-0 flex-col gap-0.5">
					<span className="line-clamp-2 h-9 text-[13px] text-foreground leading-snug">
						{book.title}
					</span>
					<span className="truncate text-muted-foreground text-xs">
						{authorsLabel(book.authors)}
					</span>
					<span className="flex h-4 items-center text-muted-foreground text-xs">
						<CardMeta book={book} percent={percent} chapter={chapter} />
					</span>
				</div>
			</button>

			{!book.missing && (
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={t("library.readBook", { title: book.title })}
								onClick={onRead}
								// A touch screen has no hover to reveal it, and a shelf you tap is
								// exactly where a way straight into the book is worth having.
								className="absolute top-3 right-3 bg-background/85 text-foreground opacity-0 backdrop-blur-sm transition-opacity focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
							>
								<BookOpenIcon />
							</Button>
						}
					/>
					<TooltipContent side="bottom">{t("library.readNow")}</TooltipContent>
				</Tooltip>
			)}
		</div>
	);
}

/**
 * The one line under the author, in the order the reader would ask for it:
 * whether the file is there, then where they got to, then what they thought of
 * it, and only then the fact that they have not started.
 */
function CardMeta({
	book,
	percent,
	chapter,
}: {
	book: BookRecord;
	percent: number;
	chapter: string | null;
}) {
	const { t } = useTranslation();

	if (book.missing) {
		return (
			<span className="flex items-center gap-1 text-destructive">
				<FileQuestionIcon className="size-3.5" />
				{t("book.missing")}
			</span>
		);
	}
	if (percent > 0 && book.status !== "finished") {
		return (
			<span className="truncate tabular-nums">
				{percent}%{chapter ? ` · ${chapter}` : ""}
			</span>
		);
	}
	if (book.rating !== null) return <RatingMark rating={book.rating} />;
	return <span>{statusLabel(book.status)}</span>;
}
