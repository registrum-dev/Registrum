// The cells the table's columns are drawn with.

import { Button } from "@Registrum/ui/components/button";
import { Checkbox } from "@Registrum/ui/components/checkbox";
import { Progress } from "@Registrum/ui/components/progress";
import { cn } from "@Registrum/ui/lib/utils";
import type { Row } from "@tanstack/react-table";
import { FileQuestionIcon, PencilIcon } from "lucide-react";
import { createContext, useContext } from "react";
import { useTranslation } from "react-i18next";
import { fieldLabel } from "@/features/library/columns";
import {
	authorsLabel,
	categoryLabel,
	fileSizeLabel,
	publishedLabel,
	seriesLabel,
	shortDate,
	statusLabel,
} from "@/features/library/labels";
import {
	type BookRecord,
	type NameKind,
	progressPercent,
} from "@/features/library/types";
import { BookCover } from "./book-cover";
import { FavoriteToggle, RatingPicker, StatusDot } from "./book-marks";
import type { Features } from "./book-table-columns";
import { NameLink, NameLinks, SeriesLink } from "./name-link";

/** Where a row can take you. */
export const RowActions = createContext<{
	openDetail: (book: BookRecord) => void;
	openReader: (book: BookRecord) => void;
	edit: (book: BookRecord) => void;
}>({ openDetail: () => {}, openReader: () => {}, edit: () => {} });

export function SelectCell({ row }: { row: Row<Features, BookRecord> }) {
	const { t } = useTranslation();

	return (
		<Checkbox
			aria-label={t("table.selectBook", { title: row.original.title })}
			checked={row.getIsSelected()}
			onCheckedChange={(checked, details) => {
				// Shift rides on the click, not on the change; Base UI passes it through.
				const { event } = details;
				row.getToggleSelectedHandler()({
					target: { checked },
					shiftKey: "shiftKey" in event && event.shiftKey,
					nativeEvent: event,
				});
			}}
		/>
	);
}

export function EditButton({ book }: { book: BookRecord }) {
	const { t } = useTranslation();
	const { edit } = useContext(RowActions);

	return (
		<Button
			variant="ghost"
			size="icon-sm"
			aria-label={t("book.editBook", { title: book.title })}
			onClick={() => edit(book)}
		>
			<PencilIcon />
		</Button>
	);
}

/**
 * What tells one row from another: the cover, the title, and underneath it the
 * names the book files itself under. The way into the book's own screen;
 * double-clicking the row starts reading.
 */
export function BookCell({ book }: { book: BookRecord }) {
	const { t } = useTranslation();
	const { openDetail } = useContext(RowActions);

	return (
		<div className="flex min-w-0 items-center gap-3">
			<BookCover
				book={book}
				showFallbackTitle={false}
				className="w-8 shrink-0 rounded-sm"
			/>
			<div className="flex min-w-0 flex-col gap-0.5">
				<div className="flex min-w-0 items-center gap-1.5">
					{book.missing && (
						<FileQuestionIcon
							className="size-3.5 flex-none text-destructive"
							aria-label={t("book.fileMissing")}
						/>
					)}
					<button
						type="button"
						onClick={() => openDetail(book)}
						title={book.title}
						className="truncate rounded-xs text-left font-medium underline-offset-2 outline-none hover:underline focus-visible:underline"
					>
						{book.title}
					</button>
				</div>
				<Muted
					className="text-xs"
					title={[
						authorsLabel(book.authors),
						book.series && seriesLabel(book.series, book.seriesIndex),
					]
						.filter(Boolean)
						.join(t("common.dotSeparator"))}
				>
					{book.authors.length === 0 ? (
						t("common.unknownAuthor")
					) : (
						<Names kind="author" names={book.authors} />
					)}
					{book.series && (
						<>
							{t("common.dotSeparator")}
							<SeriesLink series={book.series} index={book.seriesIndex} />
						</>
					)}
				</Muted>
			</div>
		</div>
	);
}

/** What kind of book it is, and what kind of file it arrived in. */
export function CategoryCell({ book }: { book: BookRecord }) {
	return (
		<Lines
			top={categoryLabel(book.category)}
			bottom={<span className="uppercase tracking-wide">{book.format}</span>}
		/>
	);
}

/** The two marks the reader puts on a book without opening a dialog. */
export function MarksCell({ book }: { book: BookRecord }) {
	return (
		<div className="flex items-center gap-0.5">
			{/* Pulled left by the button's own padding, so the heart lines up with
          the text in every other column. */}
			<FavoriteToggle book={book} className="-ml-1.5" />
			<RatingPicker book={book} />
		</div>
	);
}

/** Where the book stands and how far in: the word first, the bar under it. */
export function ReadingCell({ book }: { book: BookRecord }) {
	const percent = progressPercent(book);

	return (
		<div className="flex min-w-0 flex-col gap-1.5">
			<div className="flex items-center gap-2">
				<StatusDot status={book.status} />
				<span className="truncate text-xs">{statusLabel(book.status)}</span>
				<span className="ml-auto text-muted-foreground text-xs tabular-nums">
					{percent}%
				</span>
			</div>
			<Progress
				value={percent}
				className="*:data-[slot=progress-track]:h-0.75"
			/>
		</div>
	);
}

/** When it was last read, and under it when it arrived. */
export function DatesCell({ book }: { book: BookRecord }) {
	const last = shortDate(book.lastOpenedAt);
	const added = shortDate(book.addedAt);

	return (
		<Lines
			top={last}
			bottom={added}
			numeric
			title={`${fieldLabel("lastOpened")} ${last}\n${fieldLabel("added")} ${added}`}
		/>
	);
}

/** Who published it, and when they say they did. */
export function PublishingCell({ book }: { book: BookRecord }) {
	const { t } = useTranslation();

	return (
		<Lines
			top={
				book.publisher ? (
					<NameLink kind="publisher" name={book.publisher} />
				) : (
					<span className="text-muted-foreground">{t("common.empty")}</span>
				)
			}
			bottom={publishedLabel(book)}
		/>
	);
}

/** Where the file is, and how much of the disk it is holding. */
export function FileCell({ book }: { book: BookRecord }) {
	return (
		<Lines
			top={book.path}
			bottom={fileSizeLabel(book.size)}
			numeric
			title={book.path}
		/>
	);
}

/** A cell that says two things: the one asked for, and the lighter one under it. */
function Lines({
	top,
	bottom,
	numeric,
	title,
}: {
	top: React.ReactNode;
	bottom: React.ReactNode;
	/** Digits that should line up down the column. */
	numeric?: boolean;
	title?: string;
}) {
	return (
		<div
			className={cn("flex min-w-0 flex-col gap-0.5", numeric && "tabular-nums")}
			title={title}
		>
			<div className="truncate text-[13px]">{top}</div>
			<div className="truncate text-muted-foreground text-xs">{bottom}</div>
		</div>
	);
}

function Muted({
	className,
	title,
	children,
}: {
	className?: string;
	title?: string;
	children: React.ReactNode;
}) {
	return (
		<div
			className={cn("truncate text-muted-foreground", className)}
			title={title}
		>
			{children}
		</div>
	);
}

/**
 * The names a book carries. Each one is the way to that name's own screen,
 * which is where it gets rewritten for every book at once.
 */
export function NamesCell({
	kind,
	names,
}: {
	kind: NameKind;
	names: string[];
}) {
	const { t } = useTranslation();
	if (names.length === 0) return <Muted>{t("common.empty")}</Muted>;

	return (
		<Muted title={names.join(t("common.listSeparator"))}>
			<Names kind={kind} names={names} />
		</Muted>
	);
}

/** The same names inline, for a line that carries more than them. */
function Names({ kind, names }: { kind: NameKind; names: string[] }) {
	const { t } = useTranslation();
	return (
		<NameLinks
			kind={kind}
			names={names}
			separator={t("common.listSeparator")}
		/>
	);
}
