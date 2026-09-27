// Books kept in this browser to be read without the server.

import type { BookRecord } from "@/features/shelf/types";
import { bookFileName, booksDir, recordFileName, removeFile } from "./files";
import type { SaveReply, SaveRequest } from "./save-protocol";

export interface SavedBook {
	shelfId: string;
	/** The record as it stood when the book was saved or last opened online. */
	record: BookRecord;
	savedAt: string;
}

/** The private file system, like a service worker, is only there over HTTPS
 *  or on localhost. */
export const offlineSupported =
	window.isSecureContext &&
	typeof navigator.storage?.getDirectory === "function" &&
	typeof Worker === "function";

/** Whether the copy kept is of the file the shelf has now. */
export function isCurrent(
	saved: SavedBook,
	record: Pick<BookRecord, "size" | "mtime">,
): boolean {
	return (
		saved.record.size === record.size && saved.record.mtime === record.mtime
	);
}

export async function listSaved(): Promise<SavedBook[]> {
	const dir = await booksDir();
	const saved: SavedBook[] = [];
	for await (const [name, handle] of dir.entries()) {
		if (handle.kind !== "file" || !name.endsWith(".json")) continue;
		try {
			const file = await (handle as FileSystemFileHandle).getFile();
			saved.push(JSON.parse(await file.text()) as SavedBook);
		} catch (error) {
			console.warn("Could not read a saved book's record.", error);
		}
	}
	return saved;
}

/** The saved file, if it is a copy of the one the shelf has now. */
export async function savedCopy(
	id: string,
	record: Pick<BookRecord, "size" | "mtime">,
): Promise<File | null> {
	if (!offlineSupported) return null;
	try {
		const dir = await booksDir();
		const meta = await (await dir.getFileHandle(recordFileName(id))).getFile();
		const saved = JSON.parse(await meta.text()) as SavedBook;
		if (!isCurrent(saved, record)) return null;
		return await (await dir.getFileHandle(bookFileName(id))).getFile();
	} catch {
		return null;
	}
}

export async function removeSaved(id: string): Promise<void> {
	const dir = await booksDir();
	await removeFile(dir, recordFileName(id));
	await removeFile(dir, bookFileName(id));
}

let worker: Worker | null = null;
let nextJob = 0;
const waiting = new Map<
	number,
	{
		progress?: (fraction: number) => void;
		resolve: () => void;
		reject: (error: SaveFailed) => void;
	}
>();

export class SaveFailed extends Error {
	constructor(
		message: string,
		readonly cancelled: boolean,
	) {
		super(message);
	}
}

function send(request: SaveRequest): void {
	if (!worker) {
		worker = new Worker(new URL("./save-worker.ts", import.meta.url), {
			type: "module",
		});
		worker.addEventListener("message", (event: MessageEvent<SaveReply>) => {
			const reply = event.data;
			const job = waiting.get(reply.job);
			if (!job) return;
			if (reply.type === "progress") {
				job.progress?.(reply.fraction);
				return;
			}
			waiting.delete(reply.job);
			if (reply.type === "done") job.resolve();
			else job.reject(new SaveFailed(reply.message, reply.cancelled));
		});
	}
	worker.postMessage(request);
}

/** Streams a book's file to disk; `cancel` stops it and leaves nothing behind. */
export function saveBook(
	saved: SavedBook,
	url: string,
	progress: (fraction: number) => void,
): { done: Promise<void>; cancel: () => void } {
	const job = ++nextJob;
	const done = new Promise<void>((resolve, reject) => {
		waiting.set(job, { progress, resolve, reject });
	});
	send({
		type: "save",
		job,
		id: saved.record.id,
		url,
		record: JSON.stringify(saved),
	});
	return { done, cancel: () => send({ type: "cancel", job }) };
}

/** Writes the record kept beside a saved book again. */
export function rewriteRecord(saved: SavedBook): Promise<void> {
	const job = ++nextJob;
	const done = new Promise<void>((resolve, reject) => {
		waiting.set(job, { resolve, reject });
	});
	send({
		type: "record",
		job,
		id: saved.record.id,
		record: JSON.stringify(saved),
	});
	return done;
}
