// How text is folded before it is stored or compared. The same functions run
// when a book is written and when the shelf is searched, so the two agree.

/** How wide a run of digits is padded to, so that `第2巻` sorts before `第10巻`. */
const DIGITS = 12;

/** The form two pieces of text are compared in. */
export function fold(text: string): string {
	return text.normalize("NFKC").toLowerCase();
}

/**
 * The spelling a name is written down in: full-width ASCII and the ideographic
 * space made narrow, half-width kana made wide.
 */
export function name(text: string): string {
	let out = "";
	for (const character of text) {
		const code = character.codePointAt(0) ?? 0;
		if (code >= 0xff01 && code <= 0xff5e)
			out += String.fromCodePoint(code - 0xfee0);
		else if (code === 0x3000) out += " ";
		else if (code >= 0xff61 && code <= 0xff9f)
			out += character.normalize("NFKC");
		else out += character;
	}
	// A widened `ｶﾞ` is `カ` and a combining mark until composed.
	return out.normalize("NFC");
}

/** The form text is sorted in. */
export function sortKey(text: string): string {
	let out = "";
	let digits = "";
	const flush = () => {
		if (!digits) return;
		const significant = digits.replace(/^0+/, "") || "0";
		out +=
			significant.length < DIGITS
				? significant.padStart(DIGITS, "0")
				: significant;
		digits = "";
	};
	for (const character of fold(text)) {
		if (character >= "0" && character <= "9") {
			digits += character;
			continue;
		}
		flush();
		out += hiragana(character);
	}
	flush();
	return out;
}

/** The form two paths are compared in. */
export function pathKey(path: string): string {
	return path.replaceAll("\\", "/").toLowerCase();
}

/** Katakana reads the same as hiragana to someone looking for a title. NFKC has
 *  already widened any half-width kana by the time this sees them. */
function hiragana(character: string): string {
	const code = character.codePointAt(0) ?? 0;
	return code >= 0x30a1 && code <= 0x30f6
		? String.fromCodePoint(code - 0x60)
		: character;
}
