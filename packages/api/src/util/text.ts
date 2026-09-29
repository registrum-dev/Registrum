// Small operations on strings that several parts of the library share.

/** Two values in plain `<` order: by UTF-16 code unit for strings, which is
 *  the order the folded keys (`fold.sortKey`) are made to be compared in. */
export function compare(a: string | number, b: string | number): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

/** How many characters a string holds, counted the way a reader counts them:
 *  by code point, so an emoji or a rare kanji is one. */
export function charCount(text: string): number {
	let count = 0;
	for (const _ of text) count += 1;
	return count;
}

/** The first `most` characters, counted as `charCount` counts them. */
export function firstChars(text: string, most: number): string {
	return [...text].slice(0, most).join("");
}

/** Trimmed, and cut to `most` characters; what is cut does not leave a space
 *  hanging at the end. */
export function clip(value: string, most: number): string {
	const trimmed = value.trim();
	if (charCount(trimmed) <= most) return trimmed;
	return firstChars(trimmed, most).trimEnd();
}

/** The values with the empty ones dropped and each kept once, in the order they
 *  first appear. */
export function unique(values: Iterable<string>): string[] {
	return [...new Set(values)].filter((value) => value !== "");
}

/** Whether a whitespace-separated list of words (`properties`, `epub:type`)
 *  holds this one. */
export function hasToken(list: string, token: string): boolean {
	return list.split(/\s+/).includes(token);
}
