// What each of the filter's lists offers, as values rather than as screen.

import i18n from "@/i18n";
import { foldIncludes, foldText } from "@/lib/fold";

import { filterValueLabel } from "./labels";
import { type LibraryFacets, type ListField, NONE, namesOf } from "./query";
import {
	BOOK_CATEGORIES,
	BOOK_FORMATS,
	BOOK_RATINGS,
	NAME_KINDS,
	type NameKind,
} from "./types";

export interface FilterOption {
	/** The value the query carries, as a string. */
	value: string;
	label: string;
	/** Books in the whole library that carry it. */
	count: number;
	/** A second line: the author a series is mostly by. */
	note: string | null;
}

export function isNameField(field: ListField): field is NameKind {
	return (NAME_KINDS as readonly string[]).includes(field);
}

/**
 * Everything one list can offer, in the order the library counts it: names
 * most-used first, a fixed vocabulary in its own order. A value no book
 * carries is left out.
 */
export function filterOptions(
	facets: LibraryFacets,
	field: ListField,
): FilterOption[] {
	const option = (
		value: string,
		count: number,
		note: string | null = null,
	): FilterOption => ({
		value,
		label: filterValueLabel(field, value),
		count,
		note,
	});

	switch (field) {
		case "series":
			return [
				...facets.series.map((entry) =>
					option(entry.name, entry.count, entry.author),
				),
				...(facets.noSeries > 0 ? [option(NONE, facets.noSeries)] : []),
			];
		case "author":
		case "publisher":
		case "collection":
		case "tag":
			return namesOf(facets, field).map((entry) =>
				option(entry.name, entry.count),
			);
		case "category":
			return BOOK_CATEGORIES.map((value) =>
				option(value, facets.categories[value] ?? 0),
			).filter((entry) => entry.count > 0);
		// Most stars first, unrated last — the order a shelf is skimmed in.
		case "rating":
			return [...[...BOOK_RATINGS].reverse().map(String), NONE]
				.map((value) => option(value, facets.ratings[value] ?? 0))
				.filter((entry) => entry.count > 0);
		case "format":
			return BOOK_FORMATS.map((value) =>
				option(value, facets.formats[value] ?? 0),
			).filter((entry) => entry.count > 0);
	}
}

/** Whether what the reader typed is in the option's name, or under it. */
export function optionMatches(option: FilterOption, typed: string): boolean {
	const wanted = typed.trim();
	return (
		foldIncludes(option.label, wanted) ||
		(option.note !== null && foldIncludes(option.note, wanted))
	);
}

let collator: { language: string; compare: Intl.Collator } | null = null;

/** Names are put in the order the reader's language puts them. */
function compareNames(a: string, b: string): number {
	if (collator?.language !== i18n.language) {
		collator = {
			language: i18n.language,
			compare: new Intl.Collator(i18n.language),
		};
	}
	return collator.compare.compare(foldText(a), foldText(b));
}

/** Name order, with "no series" ahead of every name. */
export function byName(a: FilterOption, b: FilterOption): number {
	if (a.value === NONE || b.value === NONE) {
		return Number(b.value === NONE) - Number(a.value === NONE);
	}
	return compareNames(a.label, b.label);
}

/** A name from the library that holds the typed text: what the search box
 *  offers to turn into a condition. */
interface NameMatch {
	kind: NameKind;
	name: string;
	count: number;
}

/** The library's names that hold the typed text, most-used first. */
export function nameMatches(
	facets: LibraryFacets,
	typed: string,
	limit: number,
): NameMatch[] {
	const wanted = typed.trim();
	if (!wanted) return [];
	return NAME_KINDS.flatMap((kind) =>
		namesOf(facets, kind)
			.filter((entry) => foldIncludes(entry.name, wanted))
			.map((entry) => ({ kind, name: entry.name, count: entry.count })),
	)
		.sort((a, b) => b.count - a.count)
		.slice(0, limit);
}
