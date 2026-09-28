// Ingesting the books a scan has read: which ones to read, and writing them down.

import { createId } from "@paralleldrive/cuid2";
import { type Database, type Prisma, transaction } from "@registrum/db";

import * as fold from "../lib/fold";
import { inside } from "../lib/paths";
import { now } from "../lib/time";
import type { ParsedBook } from "../parse";
import { searchText } from "./book";
import { addLists, fieldIds, filled, uniqueNames, unlinkNames } from "./names";
import {
	BATCH,
	type BookRecord,
	chunks,
	inBatches,
	recordsFor,
} from "./record";
import { hashFile, type ScannedFile } from "./walk";

/** One book a run is going to read: which file, and which record it lands in.
 *  The id is settled here so that the thumbnail, which is named by it, can be
 *  written before the row is. */
export interface Planned {
	file: ScannedFile;
	id: string;
	/** Whether a row with this id exists and is being read again: a book that
	 *  moved, or one the reader asked to have read again. */
	known: boolean;
	/** The file's hash, when planning already worked it out. */
	hash?: string;
}

/** One book read, waiting to be written down. */
export interface Ingested {
	plan: Planned;
	parsed: ParsedBook;
	/** The thumbnail's name, already written. */
	coverFile: string | null;
	hash: string;
}

/** A book the reader asked to have read again, as far as the record can say
 *  where it is. */
export interface Previous {
	id: string;
	path: string;
	title: string;
}

/** Brings the shelf in line with what the walk found, and says which books are
 *  worth opening -- and, for each, whether it is a record that moved. */
export async function planScan(
	db: Database,
	shelfId: string,
	root: string,
	walked: ScannedFile[],
): Promise<Planned[]> {
	const rows = await db.book.findMany({
		where: { shelfId },
		select: { id: true, path: true, size: true, hash: true, missing: true },
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

	// The records whose file is not where it was, filed under their contents.
	const lost = new Map<string, string[]>();
	const lostSizes = new Set<number>();
	for (const book of known.values()) {
		if (!book.missing && !gone.has(book.id)) continue;
		const ids = lost.get(book.hash);
		if (ids) ids.push(book.id);
		else lost.set(book.hash, [book.id]);
		lostSizes.add(Number(book.size));
	}

	// One record is an answer; none or several is not. A record taken is out of
	// the running, so two copies of a file cannot both land in it.
	const planned: Planned[] = [];
	for (const file of queue) {
		// Only a file the size of a lost record can have its contents.
		const hash = lostSizes.has(file.size)
			? await hashFile(inside(root, file.path)).catch(() => undefined)
			: undefined;
		const ids = hash ? lost.get(hash) : undefined;
		if (hash) lost.delete(hash);
		planned.push(
			ids?.length === 1 && ids[0]
				? { file, id: ids[0], known: true, hash }
				: { file, id: createId(), known: false, hash },
		);
	}
	return planned;
}

/** The books the reader asked to have read again, as the record has them. */
export async function planRescan(
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
 * names first, then the rows, then the lists.
 */
export async function writeIngested(
	db: Database,
	shelfId: string,
	batch: readonly Ingested[],
): Promise<void> {
	if (batch.length === 0) return;
	await transaction(db, async (tx) => {
		const scannedAt = now();

		// The records being read again, as they stand. A record a scan adopted
		// that has been deleted since is simply written afresh.
		const previous = new Map<string, BookRecord>(
			(
				await recordsFor(
					tx,
					batch
						.filter((ingested) => ingested.plan.known)
						.map((ingested) => ingested.plan.id),
					shelfId,
				)
			).map((book) => [book.id, book]),
		);

		// Every name the batch mentions, written once and read back once.
		const ids = await fieldIds(
			tx,
			shelfId,
			batch,
			(ingested) => ingested.parsed.publisher,
			(ingested) => ingested.parsed.series,
		);

		const authorsOf: [string, string[]][] = [];
		const letGo: string[] = [];

		for (const { plan, parsed, coverFile, hash } of batch) {
			const row = previous.get(plan.id);
			const publisher = filled(parsed.publisher);
			const series = filled(parsed.series);
			const authors = uniqueNames(parsed.authors);

			const authorsMoved =
				!row || authors.join("\u0000") !== row.authors.join("\u0000");
			if (row && authorsMoved) letGo.push(plan.id);
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
				hash,
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
				coverFile: coverFile ?? row?.coverFile ?? null,
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
				scannedAt,
			} satisfies Prisma.BookUncheckedUpdateInput;

			await tx.book.upsert({
				where: { id: plan.id },
				create: { id: plan.id, shelfId, addedAt: scannedAt, ...read },
				update: read,
			});
		}

		await unlinkNames(tx, "author", letGo);
		await addLists(tx, shelfId, "author", authorsOf);
	});
}
