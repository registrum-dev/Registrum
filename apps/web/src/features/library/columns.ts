// The table's columns and the orders the shelf can take.

import type { SortKey, SortOrder } from "@Registrum/api/types";
import { t } from "@/i18n";
import { looseRecord } from "@/lib/schema";

export type { SortKey, SortOrder };

/** The columns that hold a control rather than a heading, and are never sorted by. */
export type FixedColumnId = "select" | "actions";

/** A column holds one or more of the book's fields, which is why the two have
 *  separate names: `column.*` heads the column, `field.*` names a field. */
export type ColumnId =
	| FixedColumnId
	| "book"
	| "category"
	| "marks"
	| "reading"
	| "dates"
	| "publishing"
	| "collection"
	| "tag"
	| "file";

export const SORT_ORDERS = [
	"asc",
	"desc",
] as const satisfies readonly SortOrder[];
export const LIBRARY_VIEWS = ["grid", "table"] as const;

export type LibraryView = (typeof LIBRARY_VIEWS)[number];

export type ColumnVisibility = Record<string, boolean>;
export type ColumnSizing = Record<string, number>;

/**
 * Which way round each field reads when it is first sorted by. Dates, ratings
 * and progress start at the top; everything else starts at A.
 */
const FIRST_ORDER: Record<SortKey, SortOrder> = {
	title: "asc",
	author: "asc",
	series: "asc",
	seriesIndex: "asc",
	collection: "asc",
	tag: "asc",
	publisher: "asc",
	published: "desc",
	category: "asc",
	format: "asc",
	status: "asc",
	favorite: "desc",
	rating: "desc",
	progress: "desc",
	lastOpened: "desc",
	added: "desc",
	size: "desc",
	path: "asc",
};

export const SORT_KEYS = Object.keys(FIRST_ORDER) as SortKey[];

interface ColumnSpec {
	/** Width before the reader drags it, in px. */
	size: number;
	/** Fixed-width control columns; they also stay out of the columns menu. */
	fixed?: true;
	/** The column that names the book. Hiding it would leave rows unidentifiable. */
	required?: true;
	/** The fields this column shows. Its heading is marked while the shelf is
	 *  sorted by any of them. */
	sorts?: readonly SortKey[];
}

/** Declaration order is column order. */
export const COLUMNS: Record<ColumnId, ColumnSpec> = {
	select: { size: 36, fixed: true },
	book: {
		size: 360,
		required: true,
		sorts: ["title", "author", "series", "seriesIndex"],
	},
	category: { size: 104, sorts: ["category", "format"] },
	marks: { size: 124, sorts: ["rating", "favorite"] },
	reading: { size: 156, sorts: ["status", "progress"] },
	dates: { size: 120, sorts: ["lastOpened", "added"] },
	publishing: { size: 150, sorts: ["publisher", "published"] },
	collection: { size: 150, sorts: ["collection"] },
	tag: { size: 170, sorts: ["tag"] },
	file: { size: 260, sorts: ["path", "size"] },
	actions: { size: 44, fixed: true },
};

/** The control columns have no heading; the rest are named in the catalogue. */
export function columnLabel(id: ColumnId): string {
	return COLUMNS[id].fixed
		? ""
		: t(`column.${id as Exclude<ColumnId, FixedColumnId>}`);
}

/** What one of the book's fields is called, wherever it is asked for. */
export function fieldLabel(sort: SortKey): string {
	return t(`field.${sort}`);
}

/** The fields a heading offers, or none for the control columns. */
export function sortsOf(id: ColumnId): readonly SortKey[] {
	return COLUMNS[id].sorts ?? [];
}

const COLUMN_IDS = Object.keys(COLUMNS) as ColumnId[];

export const HIDEABLE_COLUMNS = COLUMN_IDS.filter(
	(id) => !COLUMNS[id].fixed && !COLUMNS[id].required,
);

/** A column the reader can drag is a column that names something; the control
 *  columns are neither dragged nor sorted by. */
const RESIZABLE_COLUMNS = COLUMN_IDS.filter((id) => !COLUMNS[id].fixed);

const HIDDEN_BY_DEFAULT: ColumnId[] = [
	"publishing",
	"collection",
	"tag",
	"file",
];

export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = Object.fromEntries(
	HIDDEN_BY_DEFAULT.map((id) => [id, false]),
);

export function defaultOrder(sort: SortKey): SortOrder {
	return FIRST_ORDER[sort];
}

/** Only ever stores "hidden": */
export function normalizeVisibility(value: unknown): ColumnVisibility {
	const stored = looseRecord.parse(value);
	const hidden = HIDEABLE_COLUMNS.filter((id) =>
		id in stored
			? stored[id] === false
			: DEFAULT_COLUMN_VISIBILITY[id] === false,
	);
	return Object.fromEntries(hidden.map((id) => [id, false]));
}

export function normalizeSizing(value: unknown): ColumnSizing {
	const stored = looseRecord.parse(value);
	return Object.fromEntries(
		RESIZABLE_COLUMNS.filter(
			(id) => typeof stored[id] === "number" && Number.isFinite(stored[id]),
		).map((id) => [id, stored[id] as number]),
	);
}
