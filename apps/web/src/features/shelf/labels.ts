// The shelf's own wording.

import { toDay } from "@registrum/api/types";
import i18n, { t } from "@/i18n";
import { type FilterField, NONE } from "./filter";
import type {
	BookCategory,
	BookFormat,
	BookLayout,
	BookRating,
	BookRecord,
	BookStatus,
	FacetKind,
} from "./types";
import { BOOK_RATINGS, isComicFormat, progressPercent } from "./types";

export function categoryName(category: BookCategory): string {
	return t(`category.${category}`);
}

/** A book nobody has filed has no category, so it shows the same dash as any other empty field. */
export function categoryLabel(category: BookCategory | null): string {
	return category === null ? t("common.empty") : categoryName(category);
}

/** What a kind of name is called: the same wording the record's own fields are
 *  named with, so a name is called one thing wherever it is asked about. */
export function nameKindLabel(kind: FacetKind): string {
	return t(`field.${kind}`);
}

export function statusLabel(status: BookStatus): string {
	return t(`status.${status}`);
}

/** What one value of a filter's list is called on the filter bar and in its sheet. */
export function filterValueLabel(field: FilterField, value: string): string {
	switch (field) {
		case "series":
			return value === NONE ? t("filter.noSeries") : value;
		case "category":
			return categoryName(value as BookCategory);
		case "rating":
			return ratingLabel(value === NONE ? null : Number(value));
		case "format":
			return value.toUpperCase();
		default:
			return value;
	}
}

export function ratingLabel(rating: BookRating | null): string {
	if (rating === null) return t("common.notRated");
	return "★".repeat(rating) + "☆".repeat(BOOK_RATINGS.length - rating);
}

/** `EPUB・リフロー` / `CBZ・固定レイアウト`. The layout matters: it decides
 *  which of the reader's display settings do anything at all. */
export function formatLabel(format: BookFormat, layout: BookLayout): string {
	return t("bookLayout.format", {
		format: format.toUpperCase(),
		layout: t(`bookLayout.${layout}`),
	});
}

export function fileSizeLabel(bytes: number): string {
	if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

let dateFormat: { language: string; format: Intl.DateTimeFormat } | null = null;

function shortFormat(): Intl.DateTimeFormat {
	if (dateFormat?.language !== i18n.language) {
		dateFormat = {
			language: i18n.language,
			format:
				i18n.language === "ja"
					? new Intl.DateTimeFormat("ja-JP", {
							year: "numeric",
							month: "numeric",
							day: "numeric",
						})
					: new Intl.DateTimeFormat("en-GB", {
							year: "numeric",
							month: "short",
							day: "numeric",
						}),
		};
	}
	return dateFormat.format;
}

/** A timestamp as the reader's language writes a date, or `—` when there is none. */
export function shortDate(value: string | null): string {
	const date = parseDate(value);
	if (!date) return t("common.empty");
	return shortFormat().format(date);
}

/** A timestamp as the day it fell on here, `YYYY-MM-DD`, or `—`. */
export function isoDate(value: string | null): string {
	const date = parseDate(value);
	if (!date) return t("common.empty");
	return (
		toDay(date.getFullYear(), date.getMonth() + 1, date.getDate()) ??
		t("common.empty")
	);
}

/** The day the server read out of the publication date, or the date as the file wrote it. */
export function publishedLabel(book: BookRecord): string {
	return book.publishedDay ?? book.published ?? t("common.empty");
}

function parseDate(value: string | null): Date | null {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

export function authorsLabel(authors: string[]): string {
	return authors.join(t("common.listSeparator")) || t("common.unknownAuthor");
}

/** Where the reader stopped, as the book itself names the place. A comic
 *  archive's chapter labels are its image file names, so it has none. */
export function bookmarkLabel(book: BookRecord): string | null {
	if (isComicFormat(book.format)) return null;
	return book.position?.label ?? null;
}

/** Where the reader stopped, counted: `200 ページ中 3 ページ目`. */
export function positionLabel(book: BookRecord): string | null {
	if (book.sections <= 0) return null;
	const at = Math.max(
		1,
		Math.round((progressPercent(book) / 100) * book.sections),
	);
	return t(
		book.layout === "pre-paginated"
			? "book.pagePosition"
			: "book.sectionPosition",
		{
			at,
			total: book.sections,
		},
	);
}

/** A series name and its volume, as a shelf would file it. */
export function seriesLabel(
	series: string | null,
	index: number | null,
): string {
	if (!series) return t("common.empty");
	return index === null ? series : `${series} ${index}`;
}

/** A metadata field as prose. */
export function plainText(value: string): string {
	const spaced = value
		.replace(/<\s*br\s*\/?>/gi, "\n")
		.replace(/<\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, "\n");

	let text = spaced;
	try {
		text =
			new DOMParser().parseFromString(spaced, "text/html").body.textContent ??
			spaced;
	} catch {
		// No DOM (a test runner, say): fall back to dropping the angle brackets.
		text = spaced.replace(/<[^>]*>/g, "");
	}

	return text
		.replace(/[^\S\n]+/g, " ")
		.replace(/[ \t]*\n[ \t]*/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/** A folder under the books mount, as the screen writes it: `/manga/2024`. */
export function folderLabel(path: string): string {
	return `/${path}`;
}

/** What a shelf's row says under its name: its folder, or that it has gone. */
export function shelfDetail(shelf: { path: string; present: boolean }): string {
	const folder = folderLabel(shelf.path);
	return shelf.present ? folder : t("shelf.gone", { folder });
}
