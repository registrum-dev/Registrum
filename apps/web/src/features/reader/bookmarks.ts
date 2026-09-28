// The bookmarks of the books on the shelf. What the server last said is kept
// in this browser beside the marks made and removed since, so a book reads the
// same without it; what it has not heard of yet is handed over once it answers.

import type { Bookmark } from "@registrum/api/types";
import { api, trpc } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { isUnreachable } from "@/lib/reachability";
import { reportFailure } from "@/store/alert";

interface Kept {
	shelfId: string;
	known: Bookmark[];
	added: Bookmark[];
	removed: string[];
}

const KEY = "registrum.bookmarks";

function readAll(): Record<string, Kept> {
	try {
		const text = localStorage.getItem(KEY);
		return text ? (JSON.parse(text) as Record<string, Kept>) : {};
	} catch {
		return {};
	}
}

function writeAll(all: Record<string, Kept>): void {
	try {
		if (Object.keys(all).length === 0) localStorage.removeItem(KEY);
		else localStorage.setItem(KEY, JSON.stringify(all));
	} catch (error) {
		console.warn("Could not keep the bookmarks.", error);
	}
}

function change(
	shelfId: string,
	bookId: string,
	edit: (kept: Kept) => Kept,
): void {
	const all = readAll();
	const kept = edit(
		all[bookId] ?? { shelfId, known: [], added: [], removed: [] },
	);
	if (kept.known.length + kept.added.length + kept.removed.length === 0) {
		delete all[bookId];
	} else all[bookId] = kept;
	writeAll(all);
}

function without(marks: Bookmark[], id: string): Bookmark[] {
	return marks.filter((mark) => mark.id !== id);
}

/** The marks as the reader should see them: the server's, with what this
 *  browser has done since laid over them. */
function shown(bookId: string): Bookmark[] {
	const kept = readAll()[bookId];
	if (!kept) return [];
	const known = kept.known.filter(
		(mark) =>
			!kept.removed.includes(mark.id) &&
			!kept.added.some((added) => added.id === mark.id),
	);
	return [...known, ...kept.added].sort(
		(a, b) => a.fraction - b.fraction || a.createdAt.localeCompare(b.createdAt),
	);
}

function queryKey(shelfId: string, bookId: string) {
	return trpc.bookmark.list.queryKey({ shelfId, id: bookId });
}

function redraw(shelfId: string, bookId: string): void {
	queryClient.setQueryData(queryKey(shelfId, bookId), shown(bookId));
}

export function bookmarksQuery(shelfId: string, bookId: string) {
	return {
		queryKey: queryKey(shelfId, bookId),
		queryFn: async () => {
			try {
				const known = await api.bookmark.list.query({ shelfId, id: bookId });
				change(shelfId, bookId, (kept) => ({ ...kept, known }));
			} catch (error) {
				if (!isUnreachable(error)) throw error;
			}
			return shown(bookId);
		},
		meta: { failure: "loadShelf" as const },
	};
}

export async function addBookmark(
	shelfId: string,
	bookId: string,
	mark: Bookmark,
): Promise<void> {
	change(shelfId, bookId, (kept) => ({
		...kept,
		added: [...without(kept.added, mark.id), mark],
	}));
	redraw(shelfId, bookId);
	await send(async () => {
		await api.bookmark.add.mutate({ shelfId, id: bookId, bookmark: mark });
		landAdded(shelfId, bookId, mark);
	});
}

export async function removeBookmark(
	shelfId: string,
	bookId: string,
	markId: string,
): Promise<void> {
	// Sent even for a mark only this browser knows of: its add may have
	// landed with the answer lost.
	change(shelfId, bookId, (kept) => ({
		...kept,
		added: without(kept.added, markId),
		removed: [...kept.removed.filter((id) => id !== markId), markId],
	}));
	redraw(shelfId, bookId);
	await send(async () => {
		await api.bookmark.remove.mutate({
			shelfId,
			id: bookId,
			bookmarkId: markId,
		});
		landRemoved(shelfId, bookId, markId);
	});
}

function landAdded(shelfId: string, bookId: string, mark: Bookmark): void {
	change(shelfId, bookId, (kept) =>
		kept.added.some((added) => added.id === mark.id)
			? {
					...kept,
					known: [...without(kept.known, mark.id), mark],
					added: without(kept.added, mark.id),
				}
			: kept,
	);
}

function landRemoved(shelfId: string, bookId: string, markId: string): void {
	change(shelfId, bookId, (kept) => ({
		...kept,
		known: without(kept.known, markId),
		removed: kept.removed.filter((id) => id !== markId),
	}));
}

/** Without the server, the change waits in this browser. */
async function send(run: () => Promise<void>): Promise<void> {
	try {
		await run();
	} catch (error) {
		if (isUnreachable(error)) return;
		console.warn("Could not write a bookmark.", error);
		reportFailure(error, "save");
	}
}

/** Hands every change kept here to the server. Stops, keeping the rest, if it
 *  cannot be reached. */
export async function sendBookmarks(): Promise<void> {
	for (const [bookId, kept] of Object.entries(readAll())) {
		const { shelfId } = kept;
		try {
			for (const mark of kept.added) {
				await api.bookmark.add.mutate({ shelfId, id: bookId, bookmark: mark });
				landAdded(shelfId, bookId, mark);
			}
			for (const markId of kept.removed) {
				await api.bookmark.remove.mutate({
					shelfId,
					id: bookId,
					bookmarkId: markId,
				});
				landRemoved(shelfId, bookId, markId);
			}
		} catch (error) {
			if (isUnreachable(error)) return;
			console.warn("Could not hand over a bookmark.", error);
			change(shelfId, bookId, (current) => ({
				...current,
				added: [],
				removed: [],
			}));
		}
	}
}
