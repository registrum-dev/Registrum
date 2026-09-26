// Every write to the library, laid over the cache before it lands.

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Holds } from "@/lib/ipc";

import { libraryChanged, overBooks, snapshotBooks } from "./cache";
import { useShelfId } from "./queries";
import type { LibraryQuery } from "./query";
import { useLibrary } from "./store";
import type { BookPatch, BookRecord, NameKind } from "./types";

/**
 * Gives one of the library's names another spelling, taking every book that
 * carries it along. Typing a name the shelf already holds merges the two,
 * which is the server's to carry out.
 */
export function useRenameName() {
	const { shelfId } = useShelfId();

	return useMutation({
		mutationFn: (change: { kind: NameKind; from: string; to: string }) =>
			api.library.renameName.mutate({ shelfId, ...change }),
		onSuccess: (renamed, change) => {
			// The filter would otherwise be asking for a name that no longer
			// exists, and the shelf behind it would come back empty.
			const { query, setQuery } = useLibrary.getState();
			const asked = query[change.kind] ?? [];
			if (asked.includes(change.from)) {
				const names = asked.map((name) =>
					name === change.from ? renamed.name : name,
				);
				setQuery({ [change.kind]: [...new Set(names)] } as LibraryQuery);
			}
			return libraryChanged(shelfId);
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
 *  library has been asked again. A record is never laid out holding a null the
 *  screens below it would have to draw. */
const NEVER_NULL: Record<NeverNull, true> = {
	title: true,
	authors: true,
	favorite: true,
	collections: true,
	tags: true,
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
				await api.library.update.mutate({ shelfId, ids, patch });
			}
		},
		onMutate: (edit) => (shelfId ? layOver(shelfId, [edit].flat()) : undefined),
		// `onSuccess`, not `onSettled`: the caller's own `onSuccess` runs between
		// the two.
		onSuccess: () => libraryChanged(shelfId),
		onError: (_error, _edit, restore) => {
			restore?.();
			// A run can have written some of its books before it stopped, so what
			// was put back is a guess until the library has been asked again.
			return libraryChanged(shelfId);
		},
		meta: { failure: "save" },
	});
}

/** Forgets where the books were read to, which puts them back to unread. */
export function useClearReading() {
	const { shelfId } = useShelfId();

	return useMutation({
		mutationFn: (ids: string[]) =>
			api.library.clearReading.mutate({ shelfId, ids }),
		onMutate: (ids) => {
			if (!shelfId) return;
			const cleared = new Set(ids);
			const restore = snapshotBooks(shelfId);
			overBooks(shelfId, (book) =>
				cleared.has(book.id)
					? { ...book, progress: null, status: "unread", lastOpenedAt: null }
					: book,
			);
			return restore;
		},
		onError: (_error, _ids, restore) => restore?.(),
		onSettled: () => libraryChanged(shelfId),
		meta: { failure: "save" },
	});
}

/** Drops the records and their thumbnails. The book files are never touched. */
export function useForgetBooks() {
	const { shelfId } = useShelfId();

	return useMutation({
		mutationFn: (ids: string[]) => api.library.forget.mutate({ shelfId, ids }),
		onMutate: (ids) => {
			if (!shelfId) return;
			const gone = new Set(ids);
			overBooks(shelfId, (book) => (gone.has(book.id) ? null : book));
		},
		onSettled: () => libraryChanged(shelfId),
		meta: { failure: "forgetRecord" },
	});
}
