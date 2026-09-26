// The words a record may use. Every list is declared once here, and the screen
// imports it rather than keeping a copy.

export const BOOK_FORMATS = ["epub", "pdf", "cbz", "zip"] as const;
/** The formats the reader can open. */
export type BookFormat = (typeof BOOK_FORMATS)[number];

export const BOOK_LAYOUTS = ["reflowable", "pre-paginated"] as const;
/** Whether the text reflows to the window or the page is a picture. */
export type BookLayout = (typeof BOOK_LAYOUTS)[number];

export const BOOK_CATEGORIES = [
	"novel",
	"manga",
	"doujinshi",
	"academic",
	"practical",
	"other",
] as const;
/** What kind of book this is, as the reader filed it. */
export type BookCategory = (typeof BOOK_CATEGORIES)[number];

export const BOOK_STATUSES = ["unread", "reading", "finished"] as const;
/** Worked out from the reading position, never stored. */
export type BookStatus = (typeof BOOK_STATUSES)[number];

export const NAME_KINDS = [
	"author",
	"series",
	"publisher",
	"collection",
	"tag",
] as const;
/** The names a shelf files books under, as far as a screen can rename them.
 *  The spelling is also the field `LibraryQuery` carries it in. */
export type NameKind = (typeof NAME_KINDS)[number];

export const CHARACTER_ROLES = ["main", "supporting", "minor"] as const;
/** How much of the book a person is in, which is all the map draws them by. */
export type CharacterRole = (typeof CHARACTER_ROLES)[number];

/** The stars a book can carry. */
export const BOOK_RATINGS = [1, 2, 3, 4, 5] as const;

/** A book is finished a hair short of the end: the last page of an EPUB is
 *  rarely reached exactly. */
export const FINISHED = 0.99;

/** The filter's word for "a book with none of these". The same spelling stands
 *  for no series and for no rating; they never share a field. */
export const NONE = "__none__";

function reader<T extends string>(words: readonly T[]) {
	return (word: string | null | undefined): T | null =>
		word != null && (words as readonly string[]).includes(word)
			? (word as T)
			: null;
}

/** Reads a column back. `null` for a word this version has no meaning for. */
export const readFormat = reader(BOOK_FORMATS);
export const readLayout = reader(BOOK_LAYOUTS);
export const readCategory = reader(BOOK_CATEGORIES);
export const readRole = reader(CHARACTER_ROLES);

/** The format a file's name claims, which is the only thing a walk knows. */
export function formatOfName(name: string): BookFormat | null {
	const dot = name.lastIndexOf(".");
	if (dot < 0) return null;
	return readFormat(name.slice(dot + 1).toLowerCase());
}

/** The formats that are a pile of images and nothing else: no chapter names to
 *  show, no text to search. Takes a bare string so a file's extension can be
 *  asked the same question as a record's format. */
export function isComicFormat(format: string): boolean {
	return format === "cbz" || format === "zip";
}

/** A rating, or `null` for one this version cannot draw. Used reading a row and
 *  writing one, so the two cannot disagree. */
export function rating(stars: number | null | undefined): number | null {
	return stars != null && (BOOK_RATINGS as readonly number[]).includes(stars)
		? stars
		: null;
}

export const RULE_FIELDS = [
	"title",
	"authors",
	"series",
	"seriesIndex",
	"publisher",
	"published",
	"tags",
	"collections",
	"category",
] as const;
/** The fields a path rule can write, in the order the form lists them. Also the
 *  words a model answers in when it is asked for a rule. */
export type RuleField = (typeof RULE_FIELDS)[number];

export const RULE_MODES = ["overwrite", "empty", "append"] as const;
/** What to do with what the book already carries: replace it, write only where
 *  it has nothing yet, or add to a list (on a field that is not a list, the same
 *  as replacing). */
export type RuleMode = (typeof RULE_MODES)[number];

/** The rule fields that hold a list, which are the only ones a value can be
 *  added to. */
export const LIST_RULE_FIELDS = [
	"authors",
	"tags",
	"collections",
] as const satisfies readonly RuleField[];

export function isListRuleField(field: RuleField): boolean {
	return (LIST_RULE_FIELDS as readonly RuleField[]).includes(field);
}

/** The modes the form offers for one field. */
export function modesOf(field: RuleField): RuleMode[] {
	return isListRuleField(field)
		? [...RULE_MODES]
		: RULE_MODES.filter((mode) => mode !== "append");
}

/**
 * A calendar day as `YYYY-MM-DD`, or `null` when there is no such day
 * (`2023-02-29`, month 13). The day is built in UTC and read back: a date that
 * does not exist rolls over into another one and so does not come back the
 * same.
 */
export function toDay(year: number, month: number, day: number): string | null {
	if (![year, month, day].every(Number.isInteger)) return null;
	const date = new Date(0);
	// `setUTCFullYear` rather than `Date.UTC`, which reads years 0-99 as 19xx.
	date.setUTCFullYear(year, month - 1, day);
	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	)
		return null;
	const pad = (value: number, width: number) =>
		String(value).padStart(width, "0");
	return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/**
 * A day as a person types it, as `YYYY-MM-DD`, or `null`. The whole text must
 * be the day: `2024-03-15`, `2024/3/15`, `2024.3.15`, `2024年3月15日` and
 * `20240315`, full-width digits and spaces around the separators included.
 */
export function parseDay(text: string): string | null {
	const normal = text.normalize("NFKC").trim();
	const match =
		/^(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?$/.exec(
			normal,
		) ?? /^(\d{4})(\d{2})(\d{2})$/.exec(normal);
	if (!match) return null;
	return toDay(Number(match[1]), Number(match[2]), Number(match[3]));
}
