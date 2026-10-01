// Reading a book's record out of where its file sits.

import { isDeepStrictEqual } from "node:util";
import type { Database } from "@registrum/db";
import { z } from "zod";

import { Failure, failingAs } from "../failure";
import * as fold from "../util/fold";
import { unique } from "../util/text";
import {
	BOOK_CATEGORIES,
	type BookCategory,
	RULE_FIELDS,
	RULE_MODES,
	type RuleField,
	type RuleMode,
} from "../vocabulary";
import { type BookPatch, updateEach } from "./patch";
import {
	bookFilterSchema,
	comparePathOrder,
	listBooks,
	PATH_ORDER,
	whereOf,
} from "./query";
import { BATCH, type BookRecord, chunks, findRecords } from "./record";

export { RULE_FIELDS, RULE_MODES, type RuleField, type RuleMode };

export const pathRuleSchema = z.object({
	pattern: z.string(),
	fields: z.array(
		z.object({
			field: z.enum(RULE_FIELDS),
			/** The text to write, with `{name}` standing for what that group caught. */
			template: z.string(),
			mode: z.enum(RULE_MODES),
		}),
	),
});
/** A pattern for the book's path, and what to write from what it caught. */
export type PathRule = z.infer<typeof pathRuleSchema>;
export type FieldRule = PathRule["fields"][number];

export const ruleTargetSchema = z.discriminatedUnion("kind", [
	/** Every book these conditions let through; no conditions is the shelf. */
	z.object({ kind: z.literal("shelf"), filter: bookFilterSchema }),
	z.object({ kind: z.literal("books"), ids: z.array(z.string()) }),
]);
/** Which books a rule is run over. */
export type RuleTarget = z.infer<typeof ruleTargetSchema>;

/** A field's value, as the preview shows it on either side of the arrow. */
export type RuleValue =
	| { kind: "empty" }
	| { kind: "text"; value: string }
	| { kind: "list"; value: string[] }
	| { kind: "number"; value: number }
	| { kind: "category"; value: BookCategory };

/** Why a field the rule caught something for is left alone. */
export type RuleSkip = "notNumber" | "notCategory";

/** One field of one book, before and after. */
export interface RuleChange {
	field: RuleField;
	before: RuleValue;
	/** What will be written; for a skipped field, the text that could not be read. */
	after: RuleValue;
	/** Something the book already carried is replaced. */
	overwrite: boolean;
	skipped: RuleSkip | null;
}

/** A run of the path, and the group that caught it if one did. */
export interface PathPiece {
	text: string;
	/** Counted from zero, in the order the groups are written. */
	group: number | null;
}

export type RuleOutcome = "changed" | "unchanged" | "missed";

export interface RuleBook {
	id: string;
	path: PathPiece[];
	outcome: RuleOutcome;
	changes: RuleChange[];
}

/** How many books one field will be written to. */
export interface FieldTally {
	field: RuleField;
	books: number;
	overwrites: number;
}

/** Everything a rule would write, book by book, and the sums the screen shows. */
export interface RulePreview {
	/** The pattern's named groups, in the order they are written. */
	groups: string[];
	books: RuleBook[];
	changed: number;
	unchanged: number;
	missed: number;
	/** Fields that will be written, over every book. */
	cells: number;
	overwrites: number;
	fields: FieldTally[];
}

/** What a rule wrote. */
export interface RuleApplied {
	books: number;
	cells: number;
}

/** A compiled pattern and the names of its groups. */
export interface Pattern {
	regex: RegExp;
	groups: string[];
}

/** The pattern, or the reason it is not one. `(?P<name>...)` is taken as well
 *  as `(?<name>...)`, since both are common spellings of a named group. */
export function compile(pattern: string): Pattern {
	const source = pattern.replaceAll("(?P<", "(?<");
	let regex: RegExp;
	try {
		regex = new RegExp(source, "du");
	} catch (error) {
		throw new Failure("badPattern", error);
	}
	// A pattern that can also match nothing names every group it has, in order.
	const names = Object.keys(
		new RegExp(`(?:${source})|`, "u").exec("")?.groups ?? {},
	);
	return { regex, groups: names };
}

/** What the rule would write. Nothing is written. */
export async function preview(
	db: Database,
	shelfId: string,
	target: RuleTarget,
	rule: PathRule,
): Promise<RulePreview> {
	const pattern = compile(rule.pattern);
	const found = await booksOf(db, shelfId, target);
	const preview: RulePreview = {
		groups: pattern.groups,
		books: [],
		changed: 0,
		unchanged: 0,
		missed: 0,
		cells: 0,
		overwrites: 0,
		fields: [],
	};
	for (const book of found) {
		const judged = evaluateBook(pattern, rule.fields, book);
		preview[judged.outcome] += 1;
		for (const change of judged.changes) {
			if (change.skipped) continue;
			preview.cells += 1;
			preview.overwrites += change.overwrite ? 1 : 0;
			let tally = preview.fields.find((each) => each.field === change.field);
			if (!tally) {
				tally = { field: change.field, books: 0, overwrites: 0 };
				preview.fields.push(tally);
			}
			tally.books += 1;
			tally.overwrites += change.overwrite ? 1 : 0;
		}
		preview.books.push(judged);
	}
	// In the order the rule names them, which is the order the screen lists them.
	const order = (field: RuleField) =>
		rule.fields.findIndex((each) => each.field === field);
	preview.fields.sort((a, b) => order(a.field) - order(b.field));
	return preview;
}

/** Works the rule out again over the shelf as it is now, and writes it. */
export async function apply(
	db: Database,
	shelfId: string,
	target: RuleTarget,
	rule: PathRule,
): Promise<RuleApplied> {
	const pattern = compile(rule.pattern);
	const found = await booksOf(db, shelfId, target);

	let cells = 0;
	const edits: [string, BookPatch][] = [];
	for (const book of found) {
		const judged = evaluateBook(pattern, rule.fields, book);
		if (judged.outcome !== "changed") continue;
		const written = judged.changes.filter((change) => !change.skipped);
		cells += written.length;
		edits.push([judged.id, patchOf(written)]);
	}
	await failingAs("db", () => updateEach(db, shelfId, edits));
	return { books: edits.length, cells };
}

/** The paths of the books a rule would run over, as the pattern sees them. */
export async function pathsOf(
	db: Database,
	shelfId: string,
	target: RuleTarget,
): Promise<string[]> {
	// The whole shelf is read for its paths alone.
	const found =
		target.kind === "shelf"
			? await failingAs("db", () =>
					db.book.findMany({
						where: whereOf(shelfId, target.filter),
						orderBy: PATH_ORDER,
						select: { path: true },
					}),
				)
			: await booksOf(db, shelfId, target);
	return found.map((book) => book.path.replaceAll("\\", "/"));
}

/** The books a rule is run over, in the order the shelf sorts them by path --
 *  the same order whether the rule runs over the shelf or over picked books. */
async function booksOf(
	db: Database,
	shelfId: string,
	target: RuleTarget,
): Promise<BookRecord[]> {
	return failingAs("db", async () => {
		if (target.kind === "shelf") {
			return (await listBooks(db, shelfId, target.filter, "path", "asc", null))
				.books;
		}
		const batches = chunks([...new Set(target.ids)], BATCH);
		const found: BookRecord[] = [];
		for (const batch of batches) {
			found.push(
				...(await findRecords(db, {
					where: { shelfId, id: { in: batch } },
					orderBy: PATH_ORDER,
				})),
			);
		}
		// Each batch came back in order; more than one is put back in the order
		// the database would have given them in one go.
		return batches.length > 1 ? found.sort(comparePathOrder) : found;
	});
}

/** One book, run through the rule. */
function evaluateBook(
	pattern: Pattern,
	fields: readonly FieldRule[],
	book: BookRecord,
): RuleBook {
	const path = book.path.replaceAll("\\", "/");
	const caught = pattern.regex.exec(path);
	if (!caught) {
		return {
			id: book.id,
			path: [{ text: path, group: null }],
			outcome: "missed",
			changes: [],
		};
	}
	const changes = fields.flatMap(
		(field) => changeOf(field, caught, pattern.groups, book) ?? [],
	);
	return {
		id: book.id,
		path: pieces(path, caught, pattern.groups),
		outcome: changes.some((change) => !change.skipped)
			? "changed"
			: "unchanged",
		changes,
	};
}

/** The path cut where the groups caught it. A group inside another is drawn as
 *  part of the outer one. */
function pieces(
	path: string,
	caught: RegExpExecArray,
	groups: readonly string[],
): PathPiece[] {
	const spans: [number, number, number][] = [];
	groups.forEach((name, at) => {
		const range = caught.indices?.groups?.[name];
		if (range && range[0] < range[1]) spans.push([range[0], range[1], at]);
	});
	spans.sort((a, b) => a[0] - b[0] || b[1] - a[1]);

	const out: PathPiece[] = [];
	let at = 0;
	for (const [start, end, group] of spans) {
		if (start < at) continue;
		if (start > at) out.push({ text: path.slice(at, start), group: null });
		out.push({ text: path.slice(start, end), group });
		at = end;
	}
	if (at < path.length) out.push({ text: path.slice(at), group: null });
	return out;
}

function isEmpty(value: RuleValue): boolean {
	switch (value.kind) {
		case "empty":
			return true;
		case "text":
			return value.value === "";
		case "list":
			return value.value.length === 0;
		default:
			return false;
	}
}

/** What one field of the rule does to one book, or nothing when it leaves the
 *  field as it is. */
function changeOf(
	rule: FieldRule,
	caught: RegExpExecArray,
	groups: readonly string[],
	book: BookRecord,
): RuleChange | null {
	const raw = fill(rule.template, caught, groups).trim();
	// Nothing caught is not a reason to clear what the book has.
	if (raw === "") return null;
	const before = heldValue(book, rule.field);
	const read = readAs(rule.field, raw);
	if ("skip" in read) {
		return {
			field: rule.field,
			before,
			after: { kind: "text", value: raw },
			overwrite: false,
			skipped: read.skip,
		};
	}
	let after = read.value;
	if (isEmpty(after)) return null;

	if (rule.mode === "empty" && !isEmpty(before)) return null;
	if (
		rule.mode === "append" &&
		before.kind === "list" &&
		after.kind === "list"
	) {
		const held = before.value;
		after = {
			kind: "list",
			value: [...held, ...after.value.filter((name) => !held.includes(name))],
		};
	}
	if (isDeepStrictEqual(after, before)) return null;
	const list = after.kind === "list";
	return {
		field: rule.field,
		overwrite: !isEmpty(before) && !(rule.mode === "append" && list),
		before,
		after,
		skipped: null,
	};
}

/** What one field's template makes of one path, read the way it would be
 *  written: `null` when the pattern misses the path or the template comes out
 *  empty, `{ raw }` when what it made cannot be read as the field. */
export function evaluateTemplate(
	pattern: Pattern,
	field: RuleField,
	template: string,
	path: string,
): { value: RuleValue } | { raw: string } | null {
	const caught = pattern.regex.exec(path);
	if (!caught) return null;
	const raw = fill(template, caught, pattern.groups).trim();
	if (raw === "") return null;
	const read = readAs(field, raw);
	return "skip" in read ? { raw } : read;
}

/** A piece of text, read as the field would hold it. */
export function readAs(
	field: RuleField,
	raw: string,
): { value: RuleValue } | { skip: RuleSkip } {
	switch (field) {
		case "title":
		case "series":
		case "publisher":
		case "published":
			return { value: { kind: "text", value: raw } };
		case "authors":
		case "tags":
		case "collections":
			return { value: { kind: "list", value: split(raw) } };
		case "seriesIndex": {
			const found = number(raw);
			return found === null
				? { skip: "notNumber" }
				: { value: { kind: "number", value: found } };
		}
		case "category": {
			const found = categoryNamed(raw);
			return found === null
				? { skip: "notCategory" }
				: { value: { kind: "category", value: found } };
		}
	}
}

/** The template with each `{name}` of a group put back as what it caught. A
 *  brace around anything that is not a group's name is left as it was typed. */
function fill(
	template: string,
	caught: RegExpExecArray,
	groups: readonly string[],
): string {
	return template.replace(/\{([^{}]*)\}/g, (whole, name: string) =>
		groups.includes(name) ? (caught.groups?.[name] ?? "") : whole,
	);
}

function heldValue(book: BookRecord, field: RuleField): RuleValue {
	const text = (value: string | null): RuleValue =>
		value ? { kind: "text", value } : { kind: "empty" };
	switch (field) {
		case "title":
			return { kind: "text", value: book.title };
		case "authors":
			return { kind: "list", value: book.authors };
		case "series":
			return text(book.series);
		case "seriesIndex":
			return book.seriesIndex === null
				? { kind: "empty" }
				: { kind: "number", value: book.seriesIndex };
		case "publisher":
			return text(book.publisher);
		case "published":
			return text(book.published);
		case "tags":
			return { kind: "list", value: book.tags };
		case "collections":
			return { kind: "list", value: book.collections };
		case "category":
			return book.category === null
				? { kind: "empty" }
				: { kind: "category", value: book.category };
	}
}

/** A list typed as one piece of text. `・` is not a separator: it sits inside
 *  names written in katakana. */
function split(text: string): string[] {
	return unique(text.split(/[、,，;；]/).map((part) => part.trim()));
}

/** A volume number, full-width digits and leading zeros and all. */
function number(text: string): number | null {
	const folded = fold.fold(text).trim();
	if (!/^\+?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(folded)) return null;
	const found = Number(folded);
	return Number.isFinite(found) && found >= 0 ? found : null;
}

/** What a reader would call each category, besides the word the record keeps. */
const CATEGORY_NAMES: Record<BookCategory, string[]> = {
	novel: ["小説", "ノベル"],
	manga: ["マンガ", "漫画", "まんが", "コミック", "comic", "comics"],
	doujinshi: ["同人誌", "同人"],
	academic: ["学術書", "学術"],
	practical: ["実用書", "実用"],
	other: ["その他"],
};

/** The category a piece of text names: the word the record keeps, or what a
 *  reader would call it. */
function categoryNamed(text: string): BookCategory | null {
	const wanted = fold.fold(text);
	return (
		BOOK_CATEGORIES.find(
			(category) =>
				fold.fold(category) === wanted ||
				CATEGORY_NAMES[category].some((name) => fold.fold(name) === wanted),
		) ?? null
	);
}

function patchOf(changes: readonly RuleChange[]): BookPatch {
	const patch: BookPatch = {};
	for (const { field, after } of changes) {
		if (after.kind === "text") {
			if (field === "title") patch.title = after.value;
			else if (field === "series") patch.series = after.value;
			else if (field === "publisher") patch.publisher = after.value;
			else if (field === "published") patch.published = after.value;
		} else if (after.kind === "number" && field === "seriesIndex") {
			patch.seriesIndex = after.value;
		} else if (after.kind === "list") {
			if (field === "authors") patch.authors = after.value;
			else if (field === "tags") patch.tags = after.value;
			else if (field === "collections") patch.collections = after.value;
		} else if (after.kind === "category" && field === "category") {
			patch.category = after.value;
		}
	}
	return patch;
}
