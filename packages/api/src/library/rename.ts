// The names books are filed under, and what adding, changing or removing one
// does to the books carrying it.

import { type Database, type Transaction, transaction } from "@registrum/db";

import { Failure } from "../failure";
import * as fold from "../util/fold";
import type { FacetKind } from "../vocabulary";
import { refreshSearchText } from "./book";
import {
	ensureIds,
	filled,
	isNameList,
	linkOf,
	nameTable,
	refreshSortKeys,
	rowsNamed,
} from "./names";

/** What a rename did. A name typed onto one the shelf already holds is a merge:
 *  the books come together and one of the two names goes. */
export interface Renamed {
	/** The name as it now stands, which is the one the screen goes on to show. */
	name: string;
	merged: boolean;
}

/** Puts a name on the shelf that no book carries yet. Answers it as it was
 *  written down. */
export async function addFacet(
	db: Database,
	shelfId: string,
	kind: FacetKind,
	name: string,
): Promise<string> {
	const spelled = filled(name);
	if (spelled === null) throw Failure.bare("emptyName");

	return transaction(db, async (tx) => {
		const [held] = await rowsNamed(tx, shelfId, kind, [spelled]);
		if (held) throw Failure.bare("nameTaken");
		await ensureIds(tx, shelfId, kind, [spelled]);
		return spelled;
	});
}

/** Takes one of the shelf's names off every book that carries it, and lets
 *  the name go. The books themselves stay. */
export async function removeFacet(
	db: Database,
	shelfId: string,
	kind: FacetKind,
	name: string,
): Promise<void> {
	await transaction(db, async (tx) => {
		const [row] = await rowsNamed(tx, shelfId, kind, [name]);
		if (!row) throw Failure.bare("noName");
		const books = await carriers(tx, kind, row.id);

		const link = linkOf(tx, kind);
		if (isNameList(kind))
			await link.table.deleteMany({ where: { [link.name]: row.id } });
		else
			await link.table.updateMany({
				where: { [link.name]: row.id },
				data: { [link.name]: null },
			});
		await nameTable(tx, kind).delete({ where: { id: row.id } });
		await refreshSearchText(tx, books);
		await refreshSortKeys(tx, books);
	});
}

/** Lets go of every name of one kind that no book carries. Answers the
 *  names that went. */
export async function removeUnused(
	db: Database,
	shelfId: string,
	kind: FacetKind,
): Promise<string[]> {
	return transaction(db, async (tx) => {
		const unused = { shelfId, books: { none: {} } };
		const rows = await nameTable(tx, kind).findMany({
			where: unused,
			select: { name: true },
		});
		await nameTable(tx, kind).deleteMany({ where: unused });
		return rows.map((row) => row.name);
	});
}

/** Gives one of the shelf's names another spelling, taking every book that
 *  carries it along. */
export async function renameFacet(
	db: Database,
	shelfId: string,
	kind: FacetKind,
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
		// The search text holds these names as text, so every book that carried
		// this one is searchable under a spelling nobody is going to type again.
		await refreshSearchText(tx, books);
		await refreshSortKeys(tx, books);
		return renamed;
	});
}

/** The books on one name, read before anything moves. */
async function carriers(
	tx: Transaction,
	kind: FacetKind,
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
	kind: FacetKind,
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
