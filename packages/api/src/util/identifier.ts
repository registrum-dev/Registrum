// A book's identifiers, told apart by scheme and written one way each.

export interface BookIdentifier {
	/** Lower-case, `""` when nobody said and the value's shape did not either. */
	scheme: string;
	value: string;
}

const ALIASES: Record<string, string> = {
	isbn10: "isbn",
	isbn13: "isbn",
	"isbn-10": "isbn",
	"isbn-13": "isbn",
	isbn_10: "isbn",
	isbn_13: "isbn",
	"mobi-asin": "asin",
	amazon: "asin",
};

const PREFIXED = /^(?:urn:)?(isbn|uuid|doi|asin):\s*(.+)$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ASIN = /^B0[0-9A-Z]{8}$/;

function isbnDigits(value: string): string {
	return value.replace(/[-\s]/g, "").toUpperCase();
}

function looksLikeIsbn(value: string): boolean {
	const digits = isbnDigits(value);
	return /^\d{9}[\dX]$/.test(digits) || /^97[89]\d{10}$/.test(digits);
}

function schemeOfShape(value: string): string {
	if (looksLikeIsbn(value)) return "isbn";
	if (UUID.test(value)) return "uuid";
	if (ASIN.test(value)) return "asin";
	return "";
}

/** One identifier as the record keeps it, or `null` for one with no value. */
export function identifierOf(
	scheme: string | null | undefined,
	raw: string,
): BookIdentifier | null {
	let value = raw.trim();
	let named = scheme?.trim().toLowerCase() ?? "";
	named = ALIASES[named] ?? named;

	const prefixed = PREFIXED.exec(value);
	const prefix = prefixed?.[1]?.toLowerCase();
	if (prefixed?.[2] && prefix && (named === "" || named === prefix)) {
		named = prefix;
		value = prefixed[2].trim();
	}
	if (!value) return null;
	if (named === "") named = schemeOfShape(value);

	switch (named) {
		case "isbn":
			return { scheme: named, value: isbnDigits(value) };
		case "uuid":
			return { scheme: named, value: value.toLowerCase() };
		case "asin":
			return { scheme: named, value: value.toUpperCase() };
		default:
			return { scheme: named, value };
	}
}

/** Each identifier once, in the order first given; the empty ones dropped. */
export function uniqueIdentifiers(
	list: readonly { scheme?: string | null; value: string }[],
): BookIdentifier[] {
	const seen = new Set<string>();
	const out: BookIdentifier[] = [];
	for (const each of list) {
		const identifier = identifierOf(each.scheme, each.value);
		if (!identifier) continue;
		const key = `${identifier.scheme}\u0000${identifier.value}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(identifier);
	}
	return out;
}
