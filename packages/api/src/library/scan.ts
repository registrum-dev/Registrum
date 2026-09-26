// One run over a shelf's files, start to finish: reading books several at a
// time, writing them down in batches, saying how far it has got.

import type { Database } from "@Registrum/db";
import { cpus } from "node:os";

import type { LibraryConfig } from "../context";
import { Failure, failingAs } from "../failure";
import { fileStem, inside } from "../lib/paths";
import { Channel, Runs } from "../lib/runs";
import { readBook } from "../parse";
import { writeCover } from "./covers";
import type { OpenShelf } from "./shelf";
import {
	type Planned,
	planRestore,
	planScan,
	sweepNames,
	type Taken,
	writeTaken,
} from "./take";
import { statBook, walk } from "./walk";

/** How many books are read at once. The reads are mostly waiting on the disk
 *  and on the image encoder, so a few more than the cores. */
const LANES = Math.min(8, Math.max(2, cpus().length || 4));
/** How many books go into one transaction at most. */
const BATCH_BOOKS = 64;
/** How often the screen is told, at most. */
const PROGRESS_EVERY_MS = 100;

/** How far the run has got. `title` is the book being read right now. */
export interface ScanProgress {
	shelfId: string;
	done: number;
	total: number;
	title: string;
}

/** What a run could not do. The books are named for the reader; why each one
 *  failed has already gone to the log. */
export interface ScanReport {
	failed: string[];
}

const progress = new Channel<ScanProgress>();

/** The runs that are going, one per shelf at most. A run started on a shelf
 *  stops the one before it, so a run the screen has given up on winds down. */
const running = new Runs();

/** Stops the run on this shelf, if one is going. */
export function cancelScan(shelfId: string): void {
	running.stop(shelfId);
}

/** Every word about runs on this shelf, until the signal says to stop listening. */
export async function* scanProgress(
	shelfId: string,
	signal?: AbortSignal,
): AsyncGenerator<ScanProgress> {
	for await (const said of progress.listen(signal))
		if (said.shelfId === shelfId) yield said;
}

/** Walks the folder, marks the books whose file has gone, and reads the books
 *  the shelf does not know yet. */
export function scan(
	db: Database,
	config: LibraryConfig,
	shelf: OpenShelf,
): Promise<ScanReport> {
	return running.run(shelf.id, async ({ signal }) => {
		const walked = await walk(shelf.root);
		const plan = await planScan(db, shelf.id, walked);
		return run(db, config, shelf, signal, plan, []);
	});
}

/** Reads these books again from their files, keeping what is the reader's own.
 *  A book whose file is no longer there is reported by its title. */
export function restore(
	db: Database,
	config: LibraryConfig,
	shelf: OpenShelf,
	ids: readonly string[],
): Promise<ScanReport> {
	return running.run(shelf.id, async ({ signal }) => {
		const previous = await planRestore(db, shelf.id, ids);
		const plan: Planned[] = [];
		const failed: string[] = [];
		for (const book of previous) {
			const file = await statBook(shelf.root, book.path).catch(() => null);
			// Nothing to read it back from; the record is all there is.
			if (file) plan.push({ file, id: book.id, known: true });
			else
				failed.push(
					book.title.trim() !== "" ? book.title : fileStem(book.path),
				);
		}
		return run(db, config, shelf, signal, plan, failed);
	});
}

/** Reads the planned books several at a time and writes them down a batch at a
 *  time, until the plan is done or the run is stopped. */
async function run(
	db: Database,
	config: LibraryConfig,
	shelf: OpenShelf,
	stopped: AbortSignal,
	plan: Planned[],
	failedFirst: string[],
): Promise<ScanReport> {
	const failed = [...failedFirst];
	const told = new Teller(shelf.id, plan.length);
	told.say();

	let swept = false;
	for (let at = 0; at < plan.length && !stopped.aborted; at += BATCH_BOOKS) {
		const batch = plan.slice(at, at + BATCH_BOOKS);
		const taken: Taken[] = [];
		let next = 0;
		const lane = async () => {
			while (next < batch.length && !stopped.aborted) {
				const planned = batch[next++] as Planned;
				told.reading(planned.file.path);
				try {
					taken.push(await readOne(config, shelf, planned));
				} catch (error) {
					// One unreadable book must not cost the reader the rest of the
					// run; it is named at the end.
					const detail =
						error instanceof Failure
							? `${error.code} ${error.detail}`
							: String(error);
					console.warn(`Could not read ${planned.file.path}: ${detail}`);
					failed.push(fileStem(planned.file.path));
				}
				told.readOne();
			}
		};
		await Promise.all(
			Array.from({ length: Math.min(LANES, batch.length) }, lane),
		);
		swept =
			(await failingAs("db", () => writeTaken(db, shelf.id, taken))) || swept;
	}

	if (swept) await sweepNames(db, shelf.id);
	return { failed };
}

/** One book, read and its thumbnail written. The record's id is already
 *  settled, which is what lets the cover be written before the row is. */
async function readOne(
	config: LibraryConfig,
	shelf: OpenShelf,
	planned: Planned,
): Promise<Taken> {
	const book = await readBook(
		inside(shelf.root, planned.file.path),
		planned.file.path,
	);
	// A cover is a nicety: one that cannot be written leaves the book without.
	const cover = book.cover
		? await writeCover(config, planned.id, book.cover).catch(() => null)
		: null;
	return { plan: planned, parsed: book.parsed, cover };
}

/** How far the run has got, told to the screen now and then rather than at
 *  every book. */
class Teller {
	#done = 0;
	#title = "";
	#last = 0;

	constructor(
		readonly shelfId: string,
		readonly total: number,
	) {}

	reading(path: string): void {
		this.#title = fileStem(path);
		this.say();
	}

	readOne(): void {
		this.#done += 1;
		this.say();
	}

	/** Tells the screen, unless it was told a moment ago. The first and the last
	 *  word always go out, and a run with nothing to read says nothing. */
	say(): void {
		if (this.total === 0) return;
		const now = Date.now();
		if (
			this.#done !== this.total &&
			this.#last !== 0 &&
			now - this.#last < PROGRESS_EVERY_MS
		)
			return;
		this.#last = now;
		progress.say({
			shelfId: this.shelfId,
			done: this.#done,
			total: this.total,
			title: this.#title,
		});
	}
}
