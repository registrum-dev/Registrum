// The shape of the shelf's question.

import {
	type FacetEntry,
	type FilterField,
	NONE,
	type ShelfFacets,
	validRating,
} from "@registrum/api/types";
import { z } from "zod";
import { filledText, optionalText } from "@/lib/schema";
import type { Holds, SameWords } from "@/lib/type-contracts";

import {
	BOOK_CATEGORIES,
	BOOK_FORMATS,
	BOOK_STATUSES,
	type FacetKind,
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

const filterSchema = z.object({
	q: optionalText,
	status: z.enum(BOOK_STATUSES).optional().catch(undefined),
	category: listOf(z.enum(BOOK_CATEGORIES)),
	// The stars are a number in the query, because that is what the column
	// holds. A settings file the reader edited can still say seven.
	rating: listOf(
		z.union([
			z.literal(NONE),
			z.number().refine((stars) => validRating(stars) !== null),
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

export type BookFilter = z.infer<typeof filterSchema>;
type FilterKey = keyof BookFilter;

const FILTER_KEYS = Object.keys(filterSchema.shape) as FilterKey[];

/** The conditions that are a list, in the order the filter bar offers them. */
export const FILTER_FIELDS = [
	"series",
	"author",
	"publisher",
	"collection",
	"tag",
	"category",
	"rating",
	"format",
] as const satisfies readonly FilterKey[];

export type FilterFieldContract = Holds<
	SameWords<FilterField, (typeof FILTER_FIELDS)[number]>
>;

/** A list's values as the filter handles them: strings, the way a key is. */
export function listValues(query: BookFilter, field: FilterField): string[] {
	return (query[field] ?? []).map(String);
}

/** The patch that makes a list hold these values; none takes it off. */
export function listPatch(field: FilterField, values: string[]): BookFilter {
	if (field === "rating") {
		return {
			rating: values.map((value) => (value === NONE ? NONE : Number(value))),
		};
	}
	return { [field]: values } as BookFilter;
}

/** Every condition off. Passed as a patch, so each field has to be named. */
export const NO_CONDITIONS: BookFilter = Object.fromEntries(
	FILTER_KEYS.map((field) => [field, undefined]),
);

export function parseFilter(value: unknown): BookFilter {
	return mergeFilter({}, filterSchema.catch({}).parse(value));
}

/** The shelf's names of one kind, most-used first, as the count gives them. */
export function namesOf(facets: ShelfFacets, kind: FacetKind): FacetEntry[] {
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
export type FacetFieldContract = Holds<
	[FacetKind] extends [FilterKey] ? true : false
>;

/** Absent, empty text and an empty list all ask for nothing. */
function isOff(value: BookFilter[FilterKey]): boolean {
	return (
		value === undefined ||
		value === "" ||
		(Array.isArray(value) && value.length === 0)
	);
}

export function isFiltered(query: BookFilter): boolean {
	return FILTER_KEYS.some((field) => !isOff(query[field]));
}

export function mergeFilter(query: BookFilter, patch: BookFilter): BookFilter {
	const next = { ...query, ...patch };
	for (const field of FILTER_KEYS) {
		if (isOff(next[field])) delete next[field];
	}
	return next;
}

/**
 * What the shelf holds, counted -- over every book on it, never over the
 * ones the conditions let through.
 */
export type {
	FacetEntry,
	FilterField,
	SeriesFacet,
	ShelfFacets,
} from "@registrum/api/types";

/** Before the first count comes back. */
export const NO_FACETS: ShelfFacets = {
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
	lastScannedAt: null,
};
