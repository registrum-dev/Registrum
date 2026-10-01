// Every write to the shelf, laid over the cache before it lands.

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Holds } from "@/lib/type-contracts";

import { invalidateShelf, overBooks, snapshotBooks } from "./cache";
import type { BookFilter } from "./filter";
import { useShelfId } from "./queries";
import { useShelfStore } from "./store";
import type { BookPatch, BookRecord, FacetKind } from "./types";

/**
 * Gives one of the shelf's names another spelling, taking every book that
 * carries it along. Typing a name the shelf already holds merges the two,
 * which is the server's to carry out.
 */
export function useRenameFacet() {
	const { shelfId } = useShelfId();

	return useMutation({
		mutationFn: (change: { kind: FacetKind; from: string; to: string }) =>
			api.book.renameFacet.mutate({ shelfId, ...change }),
		onSuccess: (renamed, change) => {
			// The filter would otherwise be asking for a name that no longer
			// exists, and the shelf behind it would come back empty.
			const { filter, setFilter } = useShelfStore.getState();
			const asked = filter[change.kind] ?? [];
			if (asked.includes(change.from)) {
				const names = asked.map((name) =>
					name === change.from ? renamed.name : name,
				);
				setFilter({ [change.kind]: [...new Set(names)] } as BookFilter);
			}
			return invalidateShelf(shelfId);
		},
		meta: { failure: "save" },
	});
}

/** Puts a name on the shelf before any book carries it. */
export function useAddFacet() {
	const { shelfId } = useShelfId();

	return useMutation({
		mutationFn: (added: { kind: FacetKind; name: string }) =>
			api.book.addFacet.mutate({ shelfId, ...added }),
		onSuccess: () => invalidateShelf(shelfId),
		meta: { failure: "save" },
	});
}

/** Takes a name off every book carrying it, and off the shelf. */
export function useRemoveFacet() {
	const { shelfId } = useShelfId();

	return useMutation({
		mutationFn: (removed: { kind: FacetKind; name: string }) =>
			api.book.removeFacet.mutate({ shelfId, ...removed }),
		onSuccess: (_done, removed) => {
			// A filter still asking for it would come back empty.
			const { filter, setFilter } = useShelfStore.getState();
			const asked = filter[removed.kind] ?? [];
			if (asked.includes(removed.name)) {
				setFilter({
					[removed.kind]: asked.filter((name) => name !== removed.name),
				} as BookFilter);
			}
			return invalidateShelf(shelfId);
		},
		meta: { failure: "save" },
	});
}

/** Takes every name of one kind that no book carries off the shelf. */
export function useRemoveUnused() {
	const { shelfId } = useShelfId();

	return useMutation({
		mutationFn: (kind: FacetKind) =>
			api.book.removeUnused.mutate({ shelfId, kind }),
		onSuccess: (removed, kind) => {
			// A filter still asking for one of them would come back empty.
			const { filter, setFilter } = useShelfStore.getState();
			const asked = filter[kind] ?? [];
			const gone = new Set(removed);
			if (asked.some((name) => gone.has(name))) {
				setFilter({
					[kind]: asked.filter((name) => !gone.has(name)),
				} as BookFilter);
			}
			return invalidateShelf(shelfId);
		},
		meta: { failure: "save" },
	});
}

/** One change, to one book or to a hundred, in a single transaction. */
export interface Edit {
	ids: string[];
	patch: BookPatch;
}

/** Compiles only while a patch names nothing a record has not got, which is
 *  what lets one be laid over the other below. */
export type PatchFieldContract = Holds<
	[keyof BookPatch] extends [keyof BookRecord] ? true : false
>;

/** A field a patch can clear although the record has nowhere to put the null. */
type NeverNull = {
	[K in keyof BookPatch]-?: null extends BookRecord[K & keyof BookRecord]
		? never
		: K;
}[keyof BookPatch];

/** Those fields, all of them: cleared, the record keeps what it had until the
 *  shelf has been asked again. A record is never laid out holding a null the
 *  screens below it would have to draw. */
const NEVER_NULL: Record<NeverNull, true> = {
	title: true,
	authors: true,
	favorite: true,
	collections: true,
	tags: true,
	identifiers: true,
};

/** A record as it will read once the patch has landed. */
function patched(book: BookRecord, patch: BookPatch): BookRecord {
	const sent = Object.fromEntries(
		Object.entries(patch).filter(
			([field, value]) =>
				value !== undefined && !(value === null && field in NEVER_NULL),
		),
	) as Partial<BookRecord>;

	return { ...book, ...sent };
}

/**
 * Lays a run of edits over every copy of those books the cache is holding, and
 * hands back the way to put things as they were.
 */
function layOver(shelfId: string, edits: Edit[]): () => void {
	const wanted = new Map<string, BookPatch>();
	for (const { ids, patch } of edits) {
		for (const id of ids) wanted.set(id, { ...wanted.get(id), ...patch });
	}

	const restore = snapshotBooks(shelfId);
	overBooks(shelfId, (book) => {
		const patch = wanted.get(book.id);
		return patch ? patched(book, patch) : book;
	});
	return restore;
}

/** Writes an edit and tells the screen its answer is out of date. */
export function useUpdateBooks() {
	const { shelfId } = useShelfId();

	return useMutation({
		// Every edit in a run, one transaction after another.
		mutationFn: async (edit: Edit | Edit[]) => {
			for (const { ids, patch } of [edit].flat()) {
				await api.book.update.mutate({ shelfId, ids, patch });
			}
		},
		onMutate: (edit) => (shelfId ? layOver(shelfId, [edit].flat()) : undefined),
		// `onSuccess`, not `onSettled`: the caller's own `onSuccess` runs between
		// the two.
		onSuccess: () => invalidateShelf(shelfId),
		onError: (_error, _edit, restore) => {
			restore?.();
			// A run can have written some of its books before it stopped, so what
			// was put back is a guess until the shelf has been asked again.
			return invalidateShelf(shelfId);
		},
		meta: { failure: "save" },
	});
}

/** Forgets where the books were read to, which puts them back to unread. */
export function useClearPosition() {
	const { shelfId } = useShelfId();

	return useMutation({
		mutationFn: (ids: string[]) =>
			api.book.clearPosition.mutate({ shelfId, ids }),
		onMutate: (ids) => {
			if (!shelfId) return;
			const cleared = new Set(ids);
			const restore = snapshotBooks(shelfId);
			overBooks(shelfId, (book) =>
				cleared.has(book.id)
					? { ...book, position: null, status: "unread", lastOpenedAt: null }
					: book,
			);
			return restore;
		},
		onError: (_error, _ids, restore) => restore?.(),
		onSettled: () => invalidateShelf(shelfId),
		meta: { failure: "save" },
	});
}

/** Drops the records and their thumbnails. The book files are never touched. */
export function useRemoveBooks() {
	const { shelfId } = useShelfId();

	return useMutation({
		mutationFn: (ids: string[]) => api.book.remove.mutate({ shelfId, ids }),
		onMutate: (ids) => {
			if (!shelfId) return;
			const gone = new Set(ids);
			overBooks(shelfId, (book) => (gone.has(book.id) ? null : book));
		},
		onSettled: () => invalidateShelf(shelfId),
		meta: { failure: "removeRecord" },
	});
}

/** Drops every book whose file the last scan could not find. */
export function useRemoveMissing() {
	const { shelfId } = useShelfId();

	return useMutation({
		mutationFn: () => api.book.removeMissing.mutate({ shelfId }),
		onMutate: () => {
			if (!shelfId) return;
			overBooks(shelfId, (book) => (book.missing ? null : book));
		},
		onSuccess: () => {
			// A filter still asking for them would come back empty.
			const { filter, setFilter } = useShelfStore.getState();
			if (filter.missing) setFilter({ missing: undefined });
		},
		onSettled: () => invalidateShelf(shelfId),
		meta: { failure: "removeRecord" },
	});
}
