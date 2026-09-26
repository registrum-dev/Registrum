// Taking in the books a scan has read: which ones to read, and writing them down.

import { type Database, type Prisma, transaction } from "@Registrum/db";
import { createId } from "@paralleldrive/cuid2";

import * as fold from "../lib/fold";
import { fileName } from "../lib/paths";
import { now } from "../lib/time";
import type { ParsedBook } from "../parse";
import { searchText } from "./book";
import {
	addLists,
	dropNames,
	fieldIds,
	filled,
	sweep,
	uniqueNames,
} from "./names";
import {
	BATCH,
	type BookRecord,
	chunks,
	inBatches,
	recordsFor,
} from "./record";
import type { ScannedFile } from "./walk";

/** One book a run is going to read: which file, and which record it lands in.
 *  The id is settled here so that the thumbnail, which is named by it, can be
 *  written before the row is. */
export interface Planned {
	file: ScannedFile;
	id: string;
	/** Whether a row with this id exists and is being read again: a book that
	 *  moved, or one the reader asked to have read again. */
	known: boolean;
}

/** One book read, waiting to be written down. */
export interface Taken {
	plan: Planned;
	parsed: ParsedBook;
	/** The thumbnail's name, already written. */
	cover: string | null;
}

/** A book the reader asked to have read again, as far as the record can say
 *  where it is. */
export interface Previous {
	id: string;
	path: string;
	title: string;
}

/** What a file shows without being opened: its name, folded the way paths are,
 *  and its size. */
function fileKey(path: string, size: number): string {
	return `${fileName(fold.pathKey(path))}\u0000${size}`;
}

/** Brings the shelf in line with what the walk found, and says which books are
 *  worth opening -- and, for each, whether it is a record that moved. */
export async function planScan(
	db: Database,
	shelfId: string,
	walked: ScannedFile[],
): Promise<Planned[]> {
	const rows = await db.book.findMany({
		where: { shelfId },
		select: { id: true, path: true, size: true, missing: true },
	});
	const known = new Map(rows.map((row) => [fold.pathKey(row.path), row]));

	const present = new Set<string>();
	const queue: ScannedFile[] = [];
	for (const file of walked) {
		const book = known.get(fold.pathKey(file.path));
		if (book) present.add(book.id);
		else queue.push(file);
	}

	// A book whose file has gone keeps its record and its reading position.
	const found: string[] = [];
	const gone = new Set<string>();
	for (const book of known.values()) {
		if (present.has(book.id) && book.missing) found.push(book.id);
		else if (!present.has(book.id) && !book.missing) gone.add(book.id);
	}
	await setMissing(db, found, [...gone]);

	// The records whose file is not where it was, filed under what a moved
	// file still shows from the outside: its name and its size.
	const lost = new Map<string, string[]>();
	for (const book of known.values()) {
		if (book.missing || gone.has(book.id)) {
			const key = fileKey(book.path, Number(book.size));
			const ids = lost.get(key);
			if (ids) ids.push(book.id);
			else lost.set(key, [book.id]);
		}
	}

	// One record is an answer; none or several is not. A record taken is out of
	// the running, so two copies of a file cannot both land in it.
	return queue.map((file) => {
		const key = fileKey(file.path, file.size);
		const ids = lost.get(key);
		lost.delete(key);
		if (ids?.length === 1 && ids[0]) return { file, id: ids[0], known: true };
		return { file, id: createId(), known: false };
	});
}

/** The books the reader asked to have read again, as the record has them. */
export async function planRestore(
	db: Database,
	shelfId: string,
	ids: readonly string[],
): Promise<Previous[]> {
	return inBatches(ids, (batch) =>
		db.book.findMany({
			where: { shelfId, id: { in: batch } },
			select: { id: true, path: true, title: true },
		}),
	);
}

/** Says which books have come back and which have gone. */
async function setMissing(
	db: Database,
	found: string[],
	gone: string[],
): Promise<void> {
	if (found.length === 0 && gone.length === 0) return;
	await transaction(db, async (tx) => {
		for (const [ids, missing] of [
			[found, false],
			[gone, true],
		] as const) {
			for (const batch of chunks(ids, BATCH)) {
				await tx.book.updateMany({
					where: { id: { in: batch } },
					data: { missing },
				});
			}
		}
	});
}

/**
 * Writes a batch of books that have just been read, in one transaction: the
 * names first, then the rows, then the lists. Answers whether any record let go
 * of a name, which is the caller's cue to sweep once the run is over.
 */
export async function writeTaken(
	db: Database,
	shelfId: string,
	batch: readonly Taken[],
): Promise<boolean> {
	if (batch.length === 0) return false;
	return transaction(db, async (tx) => {
		const indexedAt = now();

		// The records being read again, as they stand. A record a scan adopted
		// that has been deleted since is simply written afresh.
		const previous = new Map<string, BookRecord>(
			(
				await recordsFor(
					tx,
					batch
						.filter((taken) => taken.plan.known)
						.map((taken) => taken.plan.id),
					shelfId,
				)
			).map((book) => [book.id, book]),
		);

		// Every name the batch mentions, written once and read back once.
		const ids = await fieldIds(
			tx,
			shelfId,
			batch,
			(taken) => taken.parsed.publisher,
			(taken) => taken.parsed.series,
		);

		const authorsOf: [string, string[]][] = [];
		const letGo: string[] = [];
		let mayOrphanNames = false;

		for (const { plan, parsed, cover } of batch) {
			const row = previous.get(plan.id);
			const publisher = filled(parsed.publisher);
			const series = filled(parsed.series);
			const authors = uniqueNames(parsed.authors);

			// A book the shelf is seeing for the first time has let go of no
			// name, so nothing can be orphaned by it.
			const authorsMoved =
				!row || authors.join("\u0000") !== row.authors.join("\u0000");
			if (row) {
				mayOrphanNames ||=
					authorsMoved || row.publisher !== publisher || row.series !== series;
				if (authorsMoved) letGo.push(plan.id);
			}
			if (authorsMoved) authorsOf.push([plan.id, parsed.authors]);

			// Every field the file speaks for is written, so a record read again is
			// overwritten whole; what is the reader's own is carried across.
			const read = {
				path: plan.file.path,
				pathKey: fold.pathKey(plan.file.path),
				format: parsed.format,
				layout: parsed.layout,
				size: BigInt(plan.file.size),
				mtime: BigInt(plan.file.mtime),
				title: parsed.title,
				titleKey: fold.sortKey(parsed.title),
				subtitle: parsed.subtitle,
				publisherId: publisher ? (ids.publisher.get(publisher) ?? null) : null,
				language: parsed.language,
				published: parsed.published,
				identifier: parsed.identifier,
				seriesId: series ? (ids.series.get(series) ?? null) : null,
				seriesIndex: parsed.seriesIndex,
				description: parsed.description,
				sections: parsed.sections,
				// The thumbnail just written, or the one the record already had.
				cover: cover ?? row?.cover ?? null,
				missing: false,
				searchText: searchText(
					parsed.title,
					plan.file.path,
					[
						parsed.subtitle,
						series,
						publisher,
						row?.note ?? null,
						parsed.description,
					],
					[authors, row?.collections ?? [], row?.tags ?? []],
				),
				indexedAt,
			} satisfies Prisma.BookUncheckedUpdateInput;

			await tx.book.upsert({
				where: { id: plan.id },
				create: { id: plan.id, shelfId, addedAt: indexedAt, ...read },
				update: read,
			});
		}

		await dropNames(tx, "author", letGo);
		await addLists(tx, shelfId, "author", authorsOf);
		return mayOrphanNames;
	});
}

/** Drops the names no book carries any more. Once per run rather than per
 *  batch: it reads five whole tables. */
export async function sweepNames(db: Database, shelfId: string): Promise<void> {
	await transaction(db, (tx) => sweep(tx, shelfId));
}
