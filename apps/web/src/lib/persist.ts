// One key per store, kept in this browser. The reader's type and the shelf's
// columns are each browser's own; what is shared lives on the server.

import type { PersistStorage } from "zustand/middleware";

const PREFIX = "registrum.";

/** How long a change waits before it is written. */
const WRITE_DELAY_MS = 200;

/** Stands for a key being taken out, which is not the same as holding null. */
const DELETE = Symbol("delete");

/** What is waiting to be written, and what each key already holds. */
const queued = new Map<string, unknown>();
const written = new Map<string, string>();
let timer: ReturnType<typeof setTimeout> | undefined;

function queueWrite(name: string, value: unknown): void {
	const shape = value === DELETE ? "\0delete" : JSON.stringify(value ?? null);
	// A store writes on every change it makes, and most of them change nothing
	// that is kept -- a scan's progress, the books on the shelf.
	if (written.get(name) === shape) return;
	written.set(name, shape);
	queued.set(name, value);

	clearTimeout(timer);
	timer = setTimeout(flush, WRITE_DELAY_MS);
}

function flush(): void {
	clearTimeout(timer);
	const changes = [...queued];
	queued.clear();
	for (const [name, value] of changes) {
		try {
			if (value === DELETE) localStorage.removeItem(PREFIX + name);
			else localStorage.setItem(PREFIX + name, JSON.stringify(value));
		} catch (error) {
			// Private browsing, or a full quota: the settings last as long as the tab.
			console.warn("Could not keep a preference.", error);
		}
	}
}

// The tab can be closed before the wait is over.
window.addEventListener("pagehide", flush);

/** One key of this browser's preferences, as zustand's `persist` wants it. */
export function preferences<T>(): PersistStorage<T> {
	return {
		getItem(name) {
			let stored: unknown;
			try {
				const text = localStorage.getItem(PREFIX + name);
				stored = text === null ? null : JSON.parse(text);
			} catch (error) {
				console.warn(
					"Could not read a preference; falling back to the defaults.",
					error,
				);
				return null;
			}
			if (stored === undefined || stored === null) return null;

			written.set(name, JSON.stringify(stored));
			return { state: stored as T };
		},

		setItem(name, value) {
			queueWrite(name, value.state);
		},

		removeItem(name) {
			queueWrite(name, DELETE);
		},
	};
}
