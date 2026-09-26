// What the table's columns are, in order.

import {
	columnResizingFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createColumnHelper,
	type Row,
	rowSelectionFeature,
	tableFeatures,
} from "@tanstack/react-table";
import type { ReactNode } from "react";

import { COLUMNS, type ColumnId } from "@/features/library/columns";
import type { BookRecord } from "@/features/library/types";
import {
	BookCell,
	CategoryCell,
	DatesCell,
	EditButton,
	FileCell,
	MarksCell,
	NamesCell,
	PublishingCell,
	ReadingCell,
	SelectCell,
} from "./book-table-cells";

export const features = tableFeatures({
	columnVisibilityFeature,
	columnSizingFeature,
	columnResizingFeature,
	rowSelectionFeature,
});

/** The table's own shape, so a cell can name the row it is handed. */
export type Features = typeof features;

const helper = createColumnHelper<typeof features, BookRecord>();

/** Narrow enough to read at, wide enough that two lines still say something. */
export const MIN_SIZE = 96;

/** The book's own column has to hold a cover and a title side by side. */
const MIN_BOOK_SIZE = 200;

/** What each column draws, from the row it is handed. */
const CELLS: Record<ColumnId, (row: Row<Features, BookRecord>) => ReactNode> = {
	select: (row) => <SelectCell row={row} />,
	book: (row) => <BookCell book={row.original} />,
	category: (row) => <CategoryCell book={row.original} />,
	marks: (row) => <MarksCell book={row.original} />,
	reading: (row) => <ReadingCell book={row.original} />,
	dates: (row) => <DatesCell book={row.original} />,
	publishing: (row) => <PublishingCell book={row.original} />,
	collection: (row) => (
		<NamesCell kind="collection" names={row.original.collections} />
	),
	tag: (row) => <NamesCell kind="tag" names={row.original.tags} />,
	file: (row) => <FileCell book={row.original} />,
	actions: (row) => <EditButton book={row.original} />,
};

/**
 * Every column draws itself from the row it is handed, so none of them is an
 * accessor: what a column is sorted by is the SQL's business, not the table's.
 * The control columns keep their width; every other column can be dragged.
 */
export const columns = (Object.keys(COLUMNS) as ColumnId[]).map((id) =>
	helper.display({
		id,
		size: COLUMNS[id].size,
		...(COLUMNS[id].fixed
			? { enableResizing: false }
			: { minSize: id === "book" ? MIN_BOOK_SIZE : MIN_SIZE }),
		cell: ({ row }) => CELLS[id](row),
	}),
);
