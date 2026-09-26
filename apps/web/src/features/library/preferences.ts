// This browser's `library` key: what is remembered and how it is read back.

import { z } from "zod";

import { looseRecord, textOrNull } from "@/lib/schema";

import {
	defaultOrder,
	LIBRARY_VIEWS,
	normalizeSizing,
	normalizeVisibility,
	SORT_KEYS,
	SORT_ORDERS,
} from "./columns";
import { normalizePageSize } from "./paging";
import { parseQuery } from "./query";
import type { LibraryState } from "./store";

/** The fields that outlive the session. Everything else is this run's. */
const REMEMBERED = [
	"shelfId",
	"query",
	"sort",
	"order",
	"view",
	"pageSize",
	"columns",
	"columnSizes",
] as const;

/** Everything this browser remembers about how the shelf was left. */
export type Remembered = Pick<LibraryState, (typeof REMEMBERED)[number]>;

const rememberedSchema = z
	.object({
		shelfId: textOrNull,
		query: z.unknown().optional().transform(parseQuery),
		sort: z.enum(SORT_KEYS).catch("lastOpened"),
		order: z.enum(SORT_ORDERS).nullish().catch(null),
		view: z.enum(LIBRARY_VIEWS).catch("grid"),
		pageSize: z.unknown().optional().transform(normalizePageSize),
		columns: z.unknown().optional().transform(normalizeVisibility),
		columnSizes: z.unknown().optional().transform(normalizeSizing),
	})
	.transform((stored) => ({
		...stored,
		order: stored.order ?? defaultOrder(stored.sort),
	}));

/** What of the store is remembered. */
export function remembered(state: LibraryState): Remembered {
	return Object.fromEntries(
		REMEMBERED.map((key) => [key, state[key]]),
	) as Remembered;
}

/** The same key read back, each field falling to its own default. */
export function parseRemembered(stored: unknown): Remembered {
	return rememberedSchema.parse(looseRecord.parse(stored));
}
