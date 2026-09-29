// Which chapters a question may be asked about, and the text the picked ones
// send.

import type { BookText, Section } from "../parse/text";
import { charCount } from "../util/text";

/** One choice in the picker. A chapter that runs across several spine items is
 *  still one choice: the reader picks chapters, not spine items. */
export interface Chapter {
	/** The first spine item it covers, which is what the screen keys it by. */
	index: number;
	sections: number[];
	/** What the table of contents calls it. `null` where the book names nothing,
	 *  and the screen says which one it is by number. */
	label: string | null;
	chars: number;
}

/** The picker: everything that can be sent, and what is ticked before the
 *  reader touches it. */
export interface Chapters {
	chapters: Chapter[];
	/** The chapters that lie wholly behind the reading position. Empty for a
	 *  book that has never been opened. */
	defaultSections: number[];
}

/** The chapters that were picked, and the one block of text they make. */
export interface Picked {
	sections: number[];
	labels: string[];
	chars: number;
	sectionTotal: number;
	text: string;
}

/** Groups the spine items that carry words into chapters. Consecutive items
 *  under one name are one chapter. */
export function group(text: BookText): Chapter[] {
	const chapters: Chapter[] = [];
	for (const section of text.sections) {
		const chars = charCount(section.text);
		const last = chapters.at(-1);
		if (section.label !== null && last && last.label === section.label) {
			last.sections.push(section.index);
			last.chars += chars;
			continue;
		}
		chapters.push({
			index: section.index,
			sections: [section.index],
			label: section.label,
			chars,
		});
	}
	return chapters;
}

/** The chapters wholly behind a reading position. The chapter being read is not
 *  one of them: its later half has not been read yet. */
export function readSoFar(chapters: readonly Chapter[], at: number): number[] {
	return chapters
		.filter((chapter) => chapter.sections.every((index) => index < at))
		.flatMap((c) => c.sections);
}

/** Which spine item a reading position names. The steps before `!` address the
 *  itemref inside the package document, and the last of them is the itemref
 *  itself, counted the way a CFI counts elements: the first is 2. */
export function spineIndex(cfi: string): number | null {
	const step = cfi.split("!")[0]?.split("/").at(-1) ?? "";
	const digits = /^\d+/.exec(step)?.[0];
	if (!digits) return null;
	const number = Number(digits);
	return number >= 2 ? Math.floor(number / 2) - 1 : null;
}

/** The text the picked chapters send. Repeats, spine items this book does not
 *  have and items with no words in them are dropped here; `null` means nothing
 *  was left to send. */
export function pick(text: BookText, wanted: readonly number[]): Picked | null {
	const chosen = new Set(wanted);
	const picked = text.sections.filter((section) => chosen.has(section.index));
	if (picked.length === 0) return null;
	return {
		sections: picked.map((section) => section.index),
		labels: labelsOf(picked),
		chars: picked.reduce((sum, section) => sum + charCount(section.text), 0),
		sectionTotal: text.sectionTotal,
		text: joined(picked),
	};
}

/** The sections as one block of text, each headed by its chapter's name. */
export function joined(sections: readonly Section[]): string {
	return sections
		.map((section) =>
			section.label ? `[${section.label}]\n${section.text}` : section.text,
		)
		.join("\n\n");
}

/** The chapter names the sections fall under, in order and without repeats. */
export function labelsOf(sections: readonly Section[]): string[] {
	const labels: string[] = [];
	for (const section of sections) {
		if (section.label && labels.at(-1) !== section.label)
			labels.push(section.label);
	}
	return labels;
}
