// The book itself, at the top of its sheet or in a column beside its record.

import { Button } from "@Registrum/ui/components/button";
import { Progress } from "@Registrum/ui/components/progress";
import { cn } from "@Registrum/ui/lib/utils";
import { BookOpenIcon, FileQuestionIcon, PencilIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	BookCover,
	clothColor,
} from "@/features/library/components/book-cover";
import {
	FavoriteToggle,
	RatingPicker,
	StatusDot,
} from "@/features/library/components/book-marks";
import { NameLinks } from "@/features/library/components/name-link";
import { coverUrl } from "@/features/library/ipc";
import {
	authorsLabel,
	bookmarkLabel,
	formatLabel,
	positionLabel,
	shortDate,
	statusLabel,
} from "@/features/library/labels";
import { type BookRecord, progressPercent } from "@/features/library/types";

/** The book itself: the top of its sheet, or a column beside its record. */
export function BookDetailAside({
	book,
	onRead,
	onEdit,
	fit = false,
}: {
	book: BookRecord;
	onRead: () => void;
	onEdit: () => void;
	/** A column held to the sheet's height: the cover gives up height so nothing scrolls. */
	fit?: boolean;
}) {
	const { t } = useTranslation();
	const percent = progressPercent(book);
	const status = book.status;
	const bound = coverUrl(book) === null;
	const bookmark = bookmarkLabel(book);
	const section = positionLabel(book);

	return (
		// The book arrives first, and again for every book stepped to
		//.
		<aside
			className={cn(
				"motion-aside flex min-w-0 shrink-0 flex-col border-border",
				fit
					? "h-full w-100 overflow-hidden border-r px-8 pt-7 pb-[calc(2.5rem+var(--safe-bottom))]"
					: "w-full border-b px-5 py-5",
			)}
			style={{
				background: bound
					? `color-mix(in srgb, ${clothColor(book.id)} 7%, var(--card))`
					: "var(--card)",
			}}
		>
			{fit ? (
				// Sized by height, not width: the slot takes what the rest leaves,
				// up to the cover's full size, and the cover follows it.
				<div className="max-h-88 min-h-0 flex-1">
					<BookCover
						book={book}
						className="mx-auto h-full max-w-full shadow-[var(--shadow-panel)]"
					/>
				</div>
			) : (
				<BookCover
					book={book}
					// `shrink-0`: an aspect-ratio box has no content to hold it open.
					className="w-full max-w-44 shrink-0 self-center shadow-[var(--shadow-panel)]"
				/>
			)}

			<div className="mt-7 flex items-center gap-2.5">
				<StatusDot status={status} />
				<span className="text-xs">{statusLabel(status)}</span>
				<span className="truncate text-muted-foreground text-xs">
					{formatLabel(book.format, book.layout)}
				</span>
			</div>

			<h1
				title={fit ? book.title : undefined}
				className={cn(
					"wrap-anywhere mt-2.5 shrink-0 font-semibold font-serif text-[27px] leading-[1.45] tracking-[0.02em]",
					fit && "line-clamp-3",
				)}
			>
				{book.title}
			</h1>
			{book.subtitle && (
				<p className="wrap-anywhere mt-1.5 text-[13px] text-muted-foreground">
					{book.subtitle}
				</p>
			)}
			<p className="wrap-anywhere mt-2.5 text-muted-foreground text-sm">
				{book.authors.length > 0 ? (
					<NameLinks
						kind="author"
						names={book.authors}
						from={book.id}
						separator={t("common.listSeparator")}
					/>
				) : (
					authorsLabel(book.authors)
				)}
			</p>

			{book.missing && (
				<p className="mt-3 flex items-center gap-1.5 text-destructive text-sm">
					<FileQuestionIcon className="size-4" />
					{t("book.fileMissing")}
				</p>
			)}

			<Button
				onClick={onRead}
				disabled={book.missing}
				className="mt-6 h-12.5 gap-2.5 rounded-xl text-[15px]"
			>
				<BookOpenIcon />
				{percent > 0 ? t("detail.continue") : t("detail.read")}
			</Button>

			{/* One button is loud here; the rest are marks, so they carry no frame
          of their own and sit on the pane. */}
			<div className="mt-3 flex items-center gap-1">
				<Button
					variant="ghost"
					onClick={onEdit}
					className="h-9 gap-2 rounded-lg px-2.5"
				>
					<PencilIcon />
					{t("detail.edit")}
				</Button>
				<div className="ml-auto flex items-center gap-1.5">
					{/* Pressed and written on the spot: not bibliography, so not the dialog. */}
					<RatingPicker book={book} />
					<FavoriteToggle
						book={book}
						size="icon"
						className="size-9 rounded-lg"
					/>
				</div>
			</div>

			<div className="mt-7 border-border border-t pt-5">
				<div className="flex items-baseline gap-1.5">
					<span className="font-semibold font-serif text-[38px] tabular-nums leading-none">
						{percent}
					</span>
					<span className="text-muted-foreground text-sm">%</span>
					{section && (
						<span className="ml-auto text-muted-foreground text-xs tabular-nums">
							{section}
						</span>
					)}
				</div>

				{/* A rule rather than a bar: it reports, and nothing here is filling up. */}
				<Progress
					value={percent}
					aria-label={t("detail.percentRead")}
					className="mt-3.5 *:data-[slot=progress-track]:h-0.75 **:data-[slot=progress-indicator]:bg-foreground *:data-[slot=progress-track]:bg-border"
				/>

				{bookmark && (
					<p className="mt-3 flex min-w-0 items-baseline gap-2 text-sm">
						<span className="shrink-0 text-muted-foreground text-xs">
							{t("detail.bookmark")}
						</span>
						<span className="truncate" title={bookmark}>
							{bookmark}
						</span>
					</p>
				)}
				<p className="mt-1.5 text-muted-foreground text-xs tabular-nums">
					{book.lastOpenedAt
						? t("detail.lastRead", { date: shortDate(book.lastOpenedAt) })
						: t("detail.neverOpened")}
				</p>
			</div>
		</aside>
	);
}
