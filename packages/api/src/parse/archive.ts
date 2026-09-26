// The little of zip that EPUB and CBZ need. The archive is opened by its
// central directory, so nothing is decompressed until an entry is asked for.

import type { Readable } from "node:stream";
import { buffer } from "node:stream/consumers";
import { promisify } from "node:util";

import yauzl, { type Entry, type Options, type ZipFile } from "yauzl";

import { Failure } from "../failure";

/** The most one entry is allowed to be. Nothing read through here -- a cover,
 *  an OPF, a comic's page -- has a reason to come near it. */
const ENTRY_LIMIT = 64 * 1024 * 1024;

/** Text as a book's own files hold it: UTF-8, a byte-order mark dropped. */
const TEXT = new TextDecoder();
const UTF8 = new TextDecoder("utf-8", { fatal: true });
const LATIN1 = new TextDecoder("latin1");

/** The general-purpose flag that says a name is UTF-8. */
const UTF8_FLAG = 0x800;

const openZip = promisify<string, Options, ZipFile>(yauzl.open);

/** Names are decoded here rather than by yauzl, which refuses a whole archive
 *  over one entry whose name climbs out of it. */
const OPEN_OPTIONS: Options = {
	lazyEntries: true,
	autoClose: false,
	decodeStrings: false,
	// A stream that runs past the size the entry states fails, so what the
	// directory says is what is read.
	validateEntrySizes: true,
};

function nameOf(entry: Entry): string {
	// With `decodeStrings: false` the name is the raw bytes, whatever the
	// type says.
	const raw: unknown = entry.fileName;
	if (typeof raw === "string") return raw;
	const bytes = raw as Uint8Array;
	if (entry.generalPurposeBitFlag & UTF8_FLAG) return TEXT.decode(bytes);
	try {
		return UTF8.decode(bytes);
	} catch {
		return LATIN1.decode(bytes);
	}
}

function readAll(zip: ZipFile): Promise<Entry[]> {
	return new Promise((resolve, reject) => {
		const entries: Entry[] = [];
		zip.on("entry", (entry: Entry) => {
			entries.push(entry);
			zip.readEntry();
		});
		zip.once("end", () => resolve(entries));
		zip.once("error", reject);
		zip.readEntry();
	});
}

export class Archive {
	readonly #zip: ZipFile;
	readonly #names: string[];
	readonly #entries = new Map<string, Entry>();

	private constructor(zip: ZipFile, entries: Entry[]) {
		this.#zip = zip;
		this.#names = [];
		for (const entry of entries) {
			const name = nameOf(entry);
			if (name.endsWith("/")) continue;
			this.#names.push(name);
			this.#entries.set(name, entry);
			const normal = name.replaceAll("\\", "/");
			if (!this.#entries.has(normal)) this.#entries.set(normal, entry);
		}
	}

	static async open(path: string): Promise<Archive> {
		try {
			const zip = await openZip(path, OPEN_OPTIONS);
			return new Archive(zip, await readAll(zip));
		} catch (error) {
			throw new Failure("readBook", error);
		}
	}

	/** Every entry's name, in the order the archive lists them. */
	names(): string[] {
		return [...this.#names];
	}

	/** One entry's bytes, or `null` when the archive has no such entry, or when
	 *  the entry is larger than an entry is allowed to be. The buffer is always
	 *  over a plain `ArrayBuffer`, so it can go out as a response body as is. */
	async entry(name: string): Promise<Buffer<ArrayBuffer> | null> {
		const entry =
			this.#entries.get(name) ?? this.#entries.get(name.replaceAll("\\", "/"));
		if (!entry || entry.uncompressedSize > ENTRY_LIMIT) return null;
		try {
			return await buffer(await this.#openReadStream(entry));
		} catch {
			return null;
		}
	}

	/** One entry's text, for the handful of XML files a book keeps. */
	async text(name: string): Promise<string | null> {
		const bytes = await this.entry(name);
		return bytes ? TEXT.decode(bytes) : null;
	}

	#openReadStream(entry: Entry): Promise<Readable> {
		return promisify<Entry, Readable>(this.#zip.openReadStream.bind(this.#zip))(
			entry,
		);
	}

	close(): void {
		this.#zip.close();
	}
}

/** Opens an archive for the length of `work`, and closes it whatever happens. */
export async function withArchive<T>(
	path: string,
	work: (archive: Archive) => Promise<T>,
): Promise<T> {
	const archive = await Archive.open(path);
	try {
		return await work(archive);
	} finally {
		archive.close();
	}
}
