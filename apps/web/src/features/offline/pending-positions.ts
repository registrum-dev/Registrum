// Reading positions the server may not have yet. Each is kept here the moment
// it is written, and handed over once the server answers again; one the server
// has since been given a newer position for is dropped instead.

import {
	type BookRecord,
	FINISHED,
	type PositionInput,
	type ReadingPosition,
} from "@registrum/api/types";
import { api } from "@/lib/api";
import { isUnreachable } from "@/lib/reachability";

interface Pending {
	shelfId: string;
	position: PositionInput;
	savedAt: string;
}

const KEY = "registrum.pendingPositions";

function readAll(): Record<string, Pending> {
	try {
		const text = localStorage.getItem(KEY);
		return text ? (JSON.parse(text) as Record<string, Pending>) : {};
	} catch {
		return {};
	}
}

function writeAll(all: Record<string, Pending>): void {
	try {
		if (Object.keys(all).length === 0) localStorage.removeItem(KEY);
		else localStorage.setItem(KEY, JSON.stringify(all));
	} catch (error) {
		console.warn("Could not keep a reading position.", error);
	}
}

/** Keeps a position until the server has it, and hands back when it was kept. */
export function keepPosition(
	shelfId: string,
	id: string,
	position: PositionInput,
): string {
	const savedAt = new Date().toISOString();
	writeAll({ ...readAll(), [id]: { shelfId, position, savedAt } });
	return savedAt;
}

/** Lets a position go once the server has it, unless a newer one took its place. */
export function dropPosition(id: string, savedAt: string): void {
	const all = readAll();
	if (all[id]?.savedAt !== savedAt) return;
	delete all[id];
	writeAll(all);
}

/** The record with a position kept here, when that is the newer one. */
export function withPendingPosition(record: BookRecord): BookRecord {
	const pending = readAll()[record.id];
	if (!pending) return record;
	if (record.position && record.position.updatedAt >= pending.savedAt) {
		return record;
	}
	const position: ReadingPosition = {
		cfi: pending.position.cfi,
		fraction: pending.position.fraction ?? 0,
		label: pending.position.label ?? null,
		updatedAt: pending.savedAt,
	};
	return {
		...record,
		position,
		status: position.fraction >= FINISHED ? "finished" : "reading",
	};
}

/** Hands every position kept here to the server. Stops, keeping the rest, if
 *  it cannot be reached. */
export async function sendPositions(): Promise<void> {
	for (const [id, pending] of Object.entries(readAll())) {
		try {
			const { shelfId, position, savedAt } = pending;
			const record = await api.book.get.query({ shelfId, id });
			const newer = record?.position && record.position.updatedAt >= savedAt;
			if (record && !newer) {
				await api.book.setPosition.mutate({ shelfId, id, position });
			}
			dropPosition(id, savedAt);
		} catch (error) {
			if (isUnreachable(error)) return;
			console.warn("Could not hand over a reading position.", error);
			dropPosition(id, pending.savedAt);
		}
	}
}
