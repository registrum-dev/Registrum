// The right half of a book's screen.

import { Button } from "@Registrum/ui/components/button";
import { cn } from "@Registrum/ui/lib/utils";
import { EraserIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookAiSections } from "@/features/ai/components/book-ai-sections";
import { SynopsisDialog } from "@/features/ai/components/synopsis-dialog";
import { useAiReady } from "@/features/ai/queries";
import { hasBookText } from "@/features/ai/types";
import { BookCover } from "@/features/library/components/book-cover";
import { ConfirmButton } from "@/features/library/components/confirm-button";
import {
	NameLink,
	NameLinks,
	SeriesLink,
} from "@/features/library/components/name-link";
import { useCurrentShelf } from "@/features/library/folder-queries";
import {
	categoryName,
	fileSizeLabel,
	folderLabel,
	formatLabel,
	isoDate,
	plainText,
	publishedLabel,
	seriesLabel,
} from "@/features/library/labels";
import {
	useClearReading,
	useForgetBooks,
	useUpdateBooks,
} from "@/features/library/mutations";
import { useSeriesVolumes } from "@/features/library/queries";
import {
	type BookRecord,
	type NameKind,
	progressPercent,
} from "@/features/library/types";
import { BookHistory } from "./book-history";
import { Absent, Prose, Row, Section } from "./detail-parts";

/** The right half of a book's screen: everything the library knows about it. */
export function BookRecordPanel({
	book,
	shelfId,
	onOpenBook,
	onForgotten,
}: {
	book: BookRecord;
	shelfId: string;
	/** Another volume of the same series. */
	onOpenBook: (book: BookRecord) => void;
	/** Called after the record is dropped, so the page can leave. */
	onForgotten: () => void;
}) {
	const { t } = useTranslation();
	const shelfPath = useCurrentShelf()?.path ?? null;

	return (
		// A beat behind the book beside or above it: what a book is, is read second.
		<div className="motion-rise flex min-w-0 flex-1 flex-col desktop:gap-7 gap-6 desktop:px-8 px-5 desktop:py-7 py-5 [--from:60ms]">
			<DescriptionSection book={book} shelfId={shelfId} />

			<Section title={t("record.note")}>
				{book.note ? (
					// A rule in the margin, not a card: the reader's own words are the
					// one thing on this screen nobody else wrote.
					<p className="max-w-[62ch] whitespace-pre-wrap border-l-2 border-l-primary/40 pl-4 text-sm leading-loose">
						{book.note}
					</p>
				) : (
					<Absent>{t("record.noNote")}</Absent>
				)}
			</Section>

			<Section
				title={t("record.reading")}
				action={<ClearReadingButton book={book} />}
			>
				<BookHistory book={book} />
			</Section>

			<Section title={t("record.bibliography")}>
				<div className="grid grid-cols-1">
					<Row
						label={t("field.series")}
						value={
							book.series ? seriesLabel(book.series, book.seriesIndex) : null
						}
					>
						{book.series && (
							<SeriesLink
								series={book.series}
								index={book.seriesIndex}
								from={book.id}
							/>
						)}
					</Row>
					<Row
						label={t("field.category")}
						value={book.category === null ? null : categoryName(book.category)}
					/>
					<Row label={t("field.publisher")} value={book.publisher}>
						{book.publisher && (
							<NameLink kind="publisher" name={book.publisher} from={book.id} />
						)}
					</Row>
					<Row
						label={t("field.published")}
						value={book.published ? publishedLabel(book) : null}
						numeric
					/>
					<Row label={t("record.language")} value={book.language} />
					<Row label={t("record.identifier")} value={book.identifier} numeric />
				</div>

				<div className="mt-4 flex flex-col gap-3">
					<Tags
						kind="collection"
						label={t("field.collection")}
						book={book}
						names={book.collections}
						absent={t("record.noCollections")}
					/>
					<Tags
						kind="tag"
						label={t("field.tag")}
						book={book}
						names={book.tags}
						absent={t("record.noTags")}
					/>
				</div>
			</Section>

			<SeriesSection book={book} onOpenBook={onOpenBook} />

			<BookAiSections book={book} shelfId={shelfId} />

			{/* The file is the least of what this screen says about the book, so it
          ends the column as a line of small type rather than a panel. */}
			<Section
				title={t("field.path")}
				action={<ForgetButton book={book} onForgotten={onForgotten} />}
			>
				<p className="text-muted-foreground text-xs tabular-nums">
					{[
						formatLabel(book.format, book.layout),
						fileSizeLabel(book.size),
						book.sections
							? t(
									book.layout === "pre-paginated"
										? "record.pageCount"
										: "record.sectionCount",
									{
										count: book.sections,
									},
								)
							: t("common.empty"),
						`${t("record.scanned")} ${isoDate(book.indexedAt)}`,
					].join(t("common.dotSeparator"))}
				</p>
				<p
					className="truncate font-mono text-xs"
					title={
						shelfPath === null
							? book.path
							: folderLabel([shelfPath, book.path].filter(Boolean).join("/"))
					}
				>
					{book.path}
				</p>
				<p className="text-muted-foreground text-xs">{t("record.pathNote")}</p>
			</Section>
		</div>
	);
}

/** What the book is about, and the one place a synopsis can be written from it. */
function DescriptionSection({
	book,
	shelfId,
}: {
	book: BookRecord;
	shelfId: string;
}) {
	const { t } = useTranslation();
	const update = useUpdateBooks();
	const ready = useAiReady();
	const [writing, setWriting] = useState(false);

	const offered = ready && hasBookText(book.format);

	return (
		<Section
			title={t("record.description")}
			action={
				offered && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setWriting(true)}
						className="ml-auto h-8 gap-1.5 rounded-lg"
					>
						<SparklesIcon />
						{book.description ? t("ai.again") : t("ai.generate")}
					</Button>
				)
			}
		>
			{book.description ? (
				<Prose>{plainText(book.description)}</Prose>
			) : (
				<Absent>{t("record.noDescription")}</Absent>
			)}

			{offered && (
				<SynopsisDialog
					open={writing}
					onOpenChange={setWriting}
					shelfId={shelfId}
					book={book}
					// Held up until the synopsis is in the record: this write replaces
					// something the reader cannot type again.
					keeping={update.isPending}
					onKeep={(text) =>
						update.mutate(
							{ ids: [book.id], patch: { description: text } },
							{ onSuccess: () => setWriting(false) },
						)
					}
				/>
			)}
		</Section>
	);
}

/** The names a book is filed under, read as one line rather than as pills:
 *  they are values of the record like every other row around them. */
function Tags({
	kind,
	label,
	book,
	names,
	absent,
}: {
	kind: NameKind;
	label: string;
	book: BookRecord;
	names: string[];
	absent?: string;
}) {
	const { t } = useTranslation();

	return (
		<div className="flex items-baseline gap-3.5">
			<span className="w-26 shrink-0 text-muted-foreground text-xs">
				{label}
			</span>
			{names.length > 0 ? (
				<span className="text-sm">
					<NameLinks
						kind={kind}
						names={names}
						from={book.id}
						separator={t("common.dotSeparator")}
					/>
				</span>
			) : (
				<span className="text-muted-foreground text-sm">{absent}</span>
			)}
		</div>
	);
}

/** The rest of the set, when there is one. */
function SeriesSection({
	book,
	onOpenBook,
}: {
	book: BookRecord;
	onOpenBook: (book: BookRecord) => void;
}) {
	const { t } = useTranslation();
	// Nothing while it is asked for: the section may turn out not to exist.
	const volumes = useSeriesVolumes(book.series).data ?? [];

	if (volumes.length < 2) return null;

	return (
		<Section title={t("record.seriesOf", { series: book.series ?? "" })}>
			<div className="flex flex-wrap gap-x-8 gap-y-3">
				{volumes.map((volume) => {
					const current = volume.id === book.id;
					const percent = progressPercent(volume);
					const where = current
						? t("record.currentVolume", { percent })
						: volume.status === "unread"
							? t("status.unread")
							: `${percent}%`;

					return (
						<button
							key={volume.id}
							type="button"
							disabled={current}
							onClick={() => onOpenBook(volume)}
							className={cn(
								"flex min-w-40 items-center gap-3 rounded-lg p-1.5 text-left",
								"transition-colors duration-[var(--dur-quick)] ease-standard",
								"focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
								current ? "bg-transparent" : "hover:bg-accent/60",
							)}
						>
							<BookCover
								book={volume}
								showFallbackTitle={false}
								className="h-13 w-auto shrink-0 rounded-md"
							/>
							<span className="flex min-w-0 flex-1 flex-col gap-0.5">
								<span className="truncate font-medium text-[13px]">
									{volume.seriesIndex === null
										? volume.title
										: t("record.volume", { index: volume.seriesIndex })}
								</span>
								<span
									className={cn(
										"truncate text-xs tabular-nums",
										current ? "text-primary" : "text-muted-foreground",
									)}
								>
									{where}
								</span>
							</span>
						</button>
					);
				})}
			</div>
		</Section>
	);
}

/** Forgets how far this book was read. Only there while there is something to forget. */
function ClearReadingButton({ book }: { book: BookRecord }) {
	const { t } = useTranslation();
	const clear = useClearReading();

	if (!book.progress && !book.lastOpenedAt) return null;

	return (
		<ConfirmButton
			variant="ghost"
			size="sm"
			className="ml-auto h-8 gap-1.5 rounded-lg text-muted-foreground"
			title={t("history.clearTitle", { title: book.title })}
			description={t("history.clearDescription")}
			confirmLabel={t("history.clearConfirm")}
			onConfirm={() => clear.mutate([book.id])}
		>
			<EraserIcon />
			{t("history.clear")}
		</ConfirmButton>
	);
}

/** Drops what the app remembers about this book. */
function ForgetButton({
	book,
	onForgotten,
}: {
	book: BookRecord;
	onForgotten: () => void;
}) {
	const { t } = useTranslation();
	const forget = useForgetBooks();

	return (
		<ConfirmButton
			variant="ghost"
			size="sm"
			className="ml-auto h-8 gap-1.5 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
			title={t("record.forgetTitle", { title: book.title })}
			description={t("book.forgetDescription")}
			confirmLabel={t("common.delete")}
			onConfirm={() => {
				forget.mutate([book.id]);
				onForgotten();
			}}
		>
			<Trash2Icon />
			{t("record.forget")}
		</ConfirmButton>
	);
}
