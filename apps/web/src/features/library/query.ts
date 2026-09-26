// The shape of the shelf's question.

import {
	type LibraryFacets,
	type ListField,
	type NameFacet,
	NONE,
	rating,
} from "@Registrum/api/types";
import { z } from "zod";
import type { Holds, SameWords } from "@/lib/ipc";
import { filledText, optionalText } from "@/lib/schema";

import {
	BOOK_CATEGORIES,
	BOOK_FORMATS,
	BOOK_STATUSES,
	type NameKind,
} from "./types";

/** The filter's word for "none of these": no series, no rating. */
export { NONE };

/** A list condition: the values it can read, each once, and none of the rest. */
function listOf<T extends z.ZodType>(item: T) {
	return z
		.array(z.unknown())
		.transform((values) => [
			...new Set(
				values.flatMap((value) => {
					const read = item.safeParse(value);
					return read.success ? [read.data as z.infer<T>] : [];
				}),
			),
		])
		.optional()
		.catch(undefined);
}

const querySchema = z.object({
	q: optionalText,
	status: z.enum(BOOK_STATUSES).optional().catch(undefined),
	category: listOf(z.enum(BOOK_CATEGORIES)),
	// The stars are a number in the query, because that is what the column
	// holds. A settings file the reader edited can still say seven.
	rating: listOf(
		z.union([
			z.literal(NONE),
			z.number().refine((stars) => rating(stars) !== null),
		]),
	),
	favorite: z.literal(true).optional().catch(undefined),
	author: listOf(filledText),
	publisher: listOf(filledText),
	series: listOf(filledText),
	collection: listOf(filledText),
	tag: listOf(filledText),
	format: listOf(z.enum(BOOK_FORMATS)),
	missing: z.literal(true).optional().catch(undefined),
});

export type LibraryQuery = z.infer<typeof querySchema>;
type QueryField = keyof LibraryQuery;

const QUERY_FIELDS = Object.keys(querySchema.shape) as QueryField[];

/** The conditions that are a list, in the order the filter bar offers them. */
export const LIST_FIELDS = [
	"series",
	"author",
	"publisher",
	"collection",
	"tag",
	"category",
	"rating",
	"format",
] as const satisfies readonly QueryField[];

export type ListFieldContract = Holds<
	SameWords<ListField, (typeof LIST_FIELDS)[number]>
>;

/** A list's values as the filter handles them: strings, the way a key is. */
export function listValues(query: LibraryQuery, field: ListField): string[] {
	return (query[field] ?? []).map(String);
}

/** The patch that makes a list hold these values; none takes it off. */
export function listPatch(field: ListField, values: string[]): LibraryQuery {
	if (field === "rating") {
		return {
			rating: values.map((value) => (value === NONE ? NONE : Number(value))),
		};
	}
	return { [field]: values } as LibraryQuery;
}

/** Every condition off. Passed as a patch, so each field has to be named. */
export const NO_CONDITIONS: LibraryQuery = Object.fromEntries(
	QUERY_FIELDS.map((field) => [field, undefined]),
);

export function parseQuery(value: unknown): LibraryQuery {
	return mergeQuery({}, querySchema.catch({}).parse(value));
}

/** The library's names of one kind, most-used first, as the count gives them. */
export function namesOf(facets: LibraryFacets, kind: NameKind): NameFacet[] {
	switch (kind) {
		case "author":
			return facets.authors;
		case "series":
			return facets.series;
		case "publisher":
			return facets.publishers;
		case "collection":
			return facets.collections;
		case "tag":
			return facets.tags;
	}
}

/** A kind of name is spelled the same as the condition that asks for it, so
 *  the two never have to be mapped onto one another. */
export type NameFieldContract = Holds<
	[NameKind] extends [QueryField] ? true : false
>;

/** Absent, empty text and an empty list all ask for nothing. */
function isOff(value: LibraryQuery[QueryField]): boolean {
	return (
		value === undefined ||
		value === "" ||
		(Array.isArray(value) && value.length === 0)
	);
}

export function isFiltered(query: LibraryQuery): boolean {
	return QUERY_FIELDS.some((field) => !isOff(query[field]));
}

export function mergeQuery(
	query: LibraryQuery,
	patch: LibraryQuery,
): LibraryQuery {
	const next = { ...query, ...patch };
	for (const field of QUERY_FIELDS) {
		if (isOff(next[field])) delete next[field];
	}
	return next;
}

/**
 * What the library holds, counted -- over the whole library, never over the
 * shelf in front of the reader.
 */
export type {
	LibraryFacets,
	ListField,
	NameFacet,
	SeriesFacet,
} from "@Registrum/api/types";

/** Before the first count comes back. */
export const NO_FACETS: LibraryFacets = {
	total: 0,
	statuses: {},
	categories: {},
	formats: {},
	ratings: {},
	favorite: 0,
	missing: 0,
	authors: [],
	publishers: [],
	series: [],
	collections: [],
	tags: [],
	noSeries: 0,
	lastScan: null,
};
