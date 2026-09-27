// Where a saved book lies in this browser's private file system. Each book is
// two files: the book itself, and the record it was saved with. The record is
// written last, so a book without one is a save that did not finish.

export const BOOKS_DIR = "books";

export function bookFileName(id: string): string {
	return `${encodeURIComponent(id)}.book`;
}

export function recordFileName(id: string): string {
	return `${encodeURIComponent(id)}.json`;
}

export async function booksDir(): Promise<FileSystemDirectoryHandle> {
	const root = await navigator.storage.getDirectory();
	return root.getDirectoryHandle(BOOKS_DIR, { create: true });
}

/** Takes a file out, and is content when it was never there. */
export async function removeFile(
	dir: FileSystemDirectoryHandle,
	name: string,
): Promise<void> {
	try {
		await dir.removeEntry(name);
	} catch (error) {
		if (!(error instanceof DOMException && error.name === "NotFoundError")) {
			throw error;
		}
	}
}
