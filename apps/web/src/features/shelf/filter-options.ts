// What each of the filter's lists offers, as values rather than as screen.

import { foldIncludes, foldText } from "@/lib/fold";
import { type FilterField, NONE, namesOf, type ShelfFacets } from "./filter";
import { filterValueLabel } from "./labels";
import {
	BOOK_CATEGORIES,
	BOOK_FORMATS,
	BOOK_RATINGS,
	FACET_KINDS,
	type FacetKind,
} from "./types";

export interface FilterOption {
	/** The value the query carries, as a string. */
	value: string;
	label: string;
	/** Books in the whole shelf that carry it. */
	count: number;
	/** A second line: the author a series is mostly by. */
	note: string | null;
}

export function isNameField(field: FilterField): field is FacetKind {
	return (FACET_KINDS as readonly string[]).includes(field);
}

/**
 * Everything one list can offer, in the order the shelf counts it: names
 * most-used first, a fixed vocabulary in its own order. A value no book
 * carries is left out.
 */
export function filterOptions(
	facets: ShelfFacets,
	field: FilterField,
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

/** An option with its text folded once, so a list of thousands is sorted
 *  and searched without folding each name again at every comparison. */
export interface FoldedOption {
	option: FilterOption;
	label: string;
	note: string | null;
}

export function foldOption(option: FilterOption): FoldedOption {
	return {
		option,
		label: foldText(option.label),
		note: option.note === null ? null : foldText(option.note),
	};
}

/** Whether the typed text, already folded, is in the option's name, or under it. */
export function optionMatches(entry: FoldedOption, folded: string): boolean {
	return entry.label.includes(folded) || Boolean(entry.note?.includes(folded));
}

/** Names in the order the reader's language puts them, with "no series"
 *  ahead of every name. Sorts in place. */
export function sortByName(
	entries: FoldedOption[],
	language: string,
): FoldedOption[] {
	const collator = new Intl.Collator(language);
	return entries.sort((a, b) => {
		if (a.option.value === NONE || b.option.value === NONE) {
			return Number(b.option.value === NONE) - Number(a.option.value === NONE);
		}
		return collator.compare(a.label, b.label);
	});
}

/** A name from the shelf that holds the typed text: what the search box
 *  offers to turn into a condition. */
interface NameMatch {
	kind: FacetKind;
	name: string;
	count: number;
}

/** The shelf's names that hold the typed text, most-used first. */
export function nameMatches(
	facets: ShelfFacets,
	typed: string,
	limit: number,
): NameMatch[] {
	const wanted = typed.trim();
	if (!wanted) return [];
	return FACET_KINDS.flatMap((kind) =>
		namesOf(facets, kind)
			.filter((entry) => foldIncludes(entry.name, wanted))
			.map((entry) => ({ kind, name: entry.name, count: entry.count })),
	)
		.sort((a, b) => b.count - a.count)
		.slice(0, limit);
}
