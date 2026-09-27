// Writes books into the private file system. Here rather than on the page:
// Safari lets a page read those files but only a worker write them, and a book
// is streamed to disk rather than held whole in memory on its way.

import { bookFileName, booksDir, recordFileName, removeFile } from "./files";
import type { SaveReply, SaveRequest } from "./save-protocol";

/** The worker-only half of the file system API, which the DOM types leave out. */
interface SyncAccessHandle {
	write(buffer: Uint8Array, options?: { at?: number }): number;
	truncate(size: number): void;
	flush(): void;
	close(): void;
}

async function openSync(
	dir: FileSystemDirectoryHandle,
	name: string,
): Promise<SyncAccessHandle> {
	const file = await dir.getFileHandle(name, { create: true });
	return (
		file as unknown as { createSyncAccessHandle(): Promise<SyncAccessHandle> }
	).createSyncAccessHandle();
}

const running = new Map<number, AbortController>();

function reply(message: SaveReply): void {
	postMessage(message);
}

async function writeText(
	dir: FileSystemDirectoryHandle,
	name: string,
	text: string,
): Promise<void> {
	const handle = await openSync(dir, name);
	try {
		handle.truncate(0);
		handle.write(new TextEncoder().encode(text), { at: 0 });
		handle.flush();
	} finally {
		handle.close();
	}
}

async function save(
	job: number,
	id: string,
	url: string,
	record: string,
): Promise<void> {
	const controller = new AbortController();
	running.set(job, controller);
	const dir = await booksDir();
	try {
		// An older copy stops counting as saved before it is written over.
		await removeFile(dir, recordFileName(id));
		const response = await fetch(url, {
			credentials: "same-origin",
			signal: controller.signal,
		});
		if (!response.ok || !response.body) {
			throw new Error(`HTTP ${response.status}`);
		}
		const total = Number(response.headers.get("content-length")) || 0;

		const handle = await openSync(dir, bookFileName(id));
		try {
			handle.truncate(0);
			const reader = response.body.getReader();
			let at = 0;
			let told = -1;
			for (;;) {
				const { done, value } = await reader.read();
				if (done) break;
				at += handle.write(value, { at });
				// Once per percent: a message per chunk is thousands for a PDF.
				const percent = total ? Math.floor((at / total) * 100) : 0;
				if (percent !== told) {
					told = percent;
					reply({ job, type: "progress", fraction: percent / 100 });
				}
			}
			handle.flush();
		} finally {
			handle.close();
		}

		await writeText(dir, recordFileName(id), record);
		reply({ job, type: "done" });
	} catch (error) {
		await removeFile(dir, bookFileName(id)).catch(() => undefined);
		reply({
			job,
			type: "failed",
			cancelled: controller.signal.aborted,
			message: error instanceof Error ? error.message : String(error),
		});
	} finally {
		running.delete(job);
	}
}

async function rewrite(job: number, id: string, record: string) {
	try {
		await writeText(await booksDir(), recordFileName(id), record);
		reply({ job, type: "done" });
	} catch (error) {
		reply({
			job,
			type: "failed",
			cancelled: false,
			message: error instanceof Error ? error.message : String(error),
		});
	}
}

addEventListener("message", (event: MessageEvent<SaveRequest>) => {
	const request = event.data;
	switch (request.type) {
		case "save":
			void save(request.job, request.id, request.url, request.record);
			break;
		case "record":
			void rewrite(request.job, request.id, request.record);
			break;
		case "cancel":
			running.get(request.job)?.abort();
			break;
	}
});
