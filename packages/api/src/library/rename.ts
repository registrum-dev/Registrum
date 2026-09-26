// The names books are filed under, and what changing one does to the books
// carrying it.

import { type Database, type Transaction, transaction } from "@Registrum/db";

import { Failure } from "../failure";
import * as fold from "../lib/fold";
import type { NameKind } from "../vocabulary";
import { refreshSearch } from "./book";
import { filled, isNameList, linkOf, nameTable, rowsNamed } from "./names";

/** What a rename did. A name typed onto one the shelf already holds is a merge:
 *  the books come together and one of the two names goes. */
export interface Renamed {
	/** The name as it now stands, which is the one the screen goes on to show. */
	name: string;
	merged: boolean;
}

/** Gives one of the shelf's names another spelling, taking every book that
 *  carries it along. */
export async function renameName(
	db: Database,
	shelfId: string,
	kind: NameKind,
	from: string,
	to: string,
): Promise<Renamed> {
	const spelled = filled(to);
	if (spelled === null) throw Failure.bare("emptyName");

	return transaction(db, async (tx) => {
		const [old] = await rowsNamed(tx, shelfId, kind, [from]);
		if (!old) throw Failure.bare("noName");
		const books = await carriers(tx, kind, old.id);

		const [into] = await rowsNamed(tx, shelfId, kind, [spelled]);
		let renamed: Renamed;
		if (into && into.id !== old.id) {
			await merge(tx, kind, old.id, into.id);
			renamed = { name: into.name, merged: true };
		} else {
			// The row keeps its id and takes the new spelling: nothing that points
			// at it has to move.
			await nameTable(tx, kind).update({
				where: { id: old.id },
				data: { name: spelled, nameKey: fold.sortKey(spelled) },
			});
			renamed = { name: spelled, merged: false };
		}
		// The haystack holds these names as text, so every book that carried
		// this one is searchable under a spelling nobody is going to type again.
		await refreshSearch(tx, books);
		return renamed;
	});
}

/** The books on one name, read before anything moves. */
async function carriers(
	tx: Transaction,
	kind: NameKind,
	id: string,
): Promise<string[]> {
	const link = linkOf(tx, kind);
	const rows = await link.table.findMany({
		where: { [link.name]: id },
		select: { [link.book]: true },
	});
	return rows.flatMap((row) => row[link.book] ?? []);
}

/**
 * Moves every book from one name onto another, and lets the first go. A book
 * on both names of a list would come out carrying one name twice, which is the
 * one thing the junction's key does not allow, so that book lets go of the old
 * one first. A name the book row points at is one column, so a book cannot
 * already be on both.
 */
async function merge(
	tx: Transaction,
	kind: NameKind,
	from: string,
	into: string,
): Promise<void> {
	const link = linkOf(tx, kind);
	if (isNameList(kind)) {
		const both = await carriers(tx, kind, into);
		await link.table.deleteMany({
			where: { [link.name]: from, bookId: { in: both } },
		});
	}
	await link.table.updateMany({
		where: { [link.name]: from },
		data: { [link.name]: into },
	});
	await nameTable(tx, kind).delete({ where: { id: from } });
}
