// How the chapters a question draws on are named.

import { t } from "@/i18n";

import type { Chapter } from "./types";

/** A chapter the table of contents never named is called by its place. */
export function chapterName(chapter: Chapter): string {
	return chapter.label ?? t("ai.sectionNumber", { number: chapter.index + 1 });
}

/** Several chapters as one line. Past three, the tail is counted, not named:
 *  the band this sits in is one line wide. */
export function chapterNames(chapters: Chapter[]): string {
	const names = chapters.map(chapterName);
	if (names.length <= 3) return names.join(t("common.dotSeparator"));
	return t("ai.moreChapters", {
		names: names.slice(0, 2).join(t("common.dotSeparator")),
		count: names.length - 2,
	});
}

/** The chapters these spine items fall in, in the order the book has them. */
export function chaptersOf(chapters: Chapter[], sections: number[]): Chapter[] {
	return chapters.filter((chapter) =>
		chapter.sections.some((index) => sections.includes(index)),
	);
}
