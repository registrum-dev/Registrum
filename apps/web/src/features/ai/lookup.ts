// What a Google Books record would change on a book, field by field.

import { identifiersLabel, plainText } from "@/features/shelf/labels";
import type {
	BookIdentifier,
	BookPatch,
	BookRecord,
} from "@/features/shelf/types";
import type { FoundVolume } from "./types";

export const LOOKUP_FIELDS = [
	"title",
	"subtitle",
	"authors",
	"publisher",
	"published",
	"description",
	"identifiers",
	"language",
] as const;
export type LookupField = (typeof LOOKUP_FIELDS)[number];

/** Which fields are written, and whether only the empty ones are. */
export interface LookupChoice {
	fields: Record<LookupField, boolean>;
	onlyEmpty: boolean;
}

export const DEFAULT_CHOICE: LookupChoice = {
	fields: Object.fromEntries(
		LOOKUP_FIELDS.map((field) => [field, true]),
	) as Record<LookupField, boolean>,
	onlyEmpty: true,
};

/** One field as it stands, and as Google has it. */
export interface FieldChange {
	field: LookupField;
	now: string;
	found: string;
	/** Whether the choice writes it. */
	written: boolean;
}

function shown(
	record: Pick<BookRecord, LookupField> | FoundVolume,
	field: LookupField,
): string {
	if (field === "authors") return record.authors.join(", ");
	if (field === "identifiers") return identifiersLabel(record.identifiers);
	const value = record[field] ?? "";
	return field === "description" ? plainText(value) : value.trim();
}

/** The book's identifiers with Google's laid in: a scheme the book has not got
 *  is added, and one it has is replaced only when not keeping what is there. */
function mergedIdentifiers(
	book: BookRecord,
	found: FoundVolume,
	onlyEmpty: boolean,
): BookIdentifier[] {
	const out = [...book.identifiers];
	for (const each of found.identifiers) {
		const at = out.findIndex((own) => own.scheme === each.scheme);
		if (at < 0) out.push(each);
		else if (!onlyEmpty) out[at] = each;
	}
	return out;
}

/** The identifiers are a list, so what is offered is the list they would
 *  become, and keeping what is there still lets a new scheme in. */
function identifierChange(
	book: BookRecord,
	found: FoundVolume,
	choice: LookupChoice,
): FieldChange[] {
	const now = identifiersLabel(book.identifiers);
	const kept = identifiersLabel(
		mergedIdentifiers(book, found, choice.onlyEmpty),
	);
	const all = identifiersLabel(mergedIdentifiers(book, found, false));
	if (all === now) return [];
	const written = choice.fields.identifiers && kept !== now;
	return [
		{
			field: "identifiers",
			now,
			found: kept !== now ? kept : all,
			written,
		},
	];
}

/** Every field Google has a different value for, and whether it is written. */
export function changesOf(
	book: BookRecord,
	found: FoundVolume,
	choice: LookupChoice,
): FieldChange[] {
	return LOOKUP_FIELDS.flatMap((field) => {
		if (field === "identifiers") return identifierChange(book, found, choice);
		const now = shown(book, field);
		const value = shown(found, field);
		if (value === "" || value === now) return [];
		const written = choice.fields[field] && (!choice.onlyEmpty || now === "");
		return [{ field, now, found: value, written }];
	});
}

/** The patch that writes what the choice lets through. Google's own markup in
 *  a description is kept: the shelf draws it as the file's would be. */
export function patchOf(
	book: BookRecord,
	found: FoundVolume,
	choice: LookupChoice,
): BookPatch {
	const patch: BookPatch = {};
	for (const change of changesOf(book, found, choice)) {
		if (!change.written) continue;
		const field = change.field;
		if (field === "authors") patch.authors = found.authors;
		else if (field === "identifiers")
			patch.identifiers = mergedIdentifiers(book, found, choice.onlyEmpty);
		else if (field === "title") patch.title = found.title;
		else patch[field] = found[field];
	}
	return patch;
}
