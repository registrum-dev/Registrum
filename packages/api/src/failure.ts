// What a failed call hands back. The screen turns `code` into a sentence from
// its own catalogue (`error.<code>`); `detail` is the underlying error.

export const FAILURE_CODES = [
	"db",
	"noShelf",
	"shelfTaken",
	"shelfName",
	"noFolder",
	"readFolder",
	"save",
	"emptyName",
	"noName",
	"badId",
	"badPath",
	"badPattern",
	"readBook",
	"notEpub",
	"noPages",
	"noBook",
	"noBookText",
	"noChapters",
	"noQuestion",
	"noCast",
	"noExample",
	"badExample",
	"aiUnset",
	"aiCall",
	"aiUnreadable",
	"aiEmpty",
	"aiStopped",
] as const;

/** The reasons a call can fail. */
export type FailureCode = (typeof FAILURE_CODES)[number];

/** What crosses to the screen. */
export interface FailureShape {
	code: FailureCode;
	/** The underlying error, shown as the detail line and logged. */
	detail: string;
}

export class Failure extends Error {
	readonly code: FailureCode;
	readonly detail: string;

	constructor(code: FailureCode, detail: unknown = "") {
		const text =
			detail instanceof Error ? detail.message : String(detail ?? "");
		super(text || code);
		this.name = "Failure";
		this.code = code;
		this.detail = text;
	}

	/** For the failures that are their own explanation. */
	static bare(code: FailureCode): Failure {
		return new Failure(code);
	}

	toShape(): FailureShape {
		return { code: this.code, detail: this.detail };
	}
}

/** Runs `work`, and reports anything it throws that is not already a failure under `code`. */
export async function failingAs<T>(
	code: FailureCode,
	work: () => Promise<T>,
): Promise<T> {
	try {
		return await work();
	} catch (error) {
		if (error instanceof Failure) throw error;
		throw new Failure(code, error);
	}
}
