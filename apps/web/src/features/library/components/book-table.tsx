// The table view.

import { Checkbox } from "@Registrum/ui/components/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@Registrum/ui/components/table";
import { cn } from "@Registrum/ui/lib/utils";
import {
	type ColumnSizingState,
	type ColumnVisibilityState,
	functionalUpdate,
	type Header,
	type Row,
	type RowSelectionState,
	type Updater,
	useTable,
} from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Presence } from "@/components/presence";
import {
	COLUMNS,
	type ColumnId,
	columnLabel,
	fieldLabel,
	type SortKey,
	type SortOrder,
	sortsOf,
} from "@/features/library/columns";
import { BookEditDialog } from "@/features/library/components/book-detail/book-edit-dialog";
import { useLibrary } from "@/features/library/store";
import { type BookRecord, progressPercent } from "@/features/library/types";
import { useLayout } from "@/hooks/use-layout";
import { BookBulkBar } from "./book-bulk-bar";
import { FavoriteMark, RatingMark, StatusDot } from "./book-marks";
import { BookCell, RowActions, SelectCell } from "./book-table-cells";
import { columns, features, MIN_SIZE } from "./book-table-columns";

/** How far the left and right arrow keys move a column edge. */
const NUDGE = 16;

/** What the row is held by stays put while the rest scrolls sideways: the tick
 *  box at one end, the pencil at the other. */
const STICKY =
	"z-20 bg-background before:absolute before:inset-0 before:-z-10 before:transition-colors before:duration-[var(--dur-quick)] before:ease-standard group-hover/row:before:bg-muted/50 group-data-[state=selected]/row:before:bg-accent";
const STICKY_SELECT = `sticky left-0 ${STICKY}`;
const STICKY_ACTIONS = `sticky right-0 ${STICKY}`;

/** Where a column sits when it is not one of those two. */
function stickyClass(id: ColumnId): string {
	if (id === "select") return STICKY_SELECT;
	if (id === "actions") return STICKY_ACTIONS;
	return "relative";
}

/**
 * The library as a table: one row per book, every field it has, in whatever
 * order and width the reader put them.
 */
export function BookTable({
	books,
	onOpenDetail,
	onOpenReader,
}: {
	books: BookRecord[];
	onOpenDetail: (book: BookRecord) => void;
	onOpenReader: (book: BookRecord) => void;
}) {
	const columnVisibility = useLibrary((state) => state.columns);
	const columnSizing = useLibrary((state) => state.columnSizes);

	// Selection is not remembered across visits: coming back to a shelf holding
	// a selection you cannot see is a way to bulk-edit the wrong books.
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	/** Which book the edit sheet last showed, and whether it is up. It keeps the
	 *  book while it closes, so the sheet can leave with its words still in it. */
	const [editing, setEditing] = useState<{ id: string; open: boolean } | null>(
		null,
	);
	const editingBook =
		editing === null
			? null
			: (books.find((book) => book.id === editing.id) ?? null);

	// A page is a visit of its own: the books that were ticked are not on screen
	// any more, and the bar would be speaking for rows nobody can see.
	const page = useLibrary((state) => state.page);
	const [seenPage, setSeenPage] = useState(page);
	if (page !== seenPage) {
		setSeenPage(page);
		setRowSelection({});
	}

	const table = useTable(
		{
			features,
			columns,
			// The page is built whole, so the header's tick box means the page --
			// the same promise it makes on screen.
			data: books,
			// Keyed by the book's id: the default index would move the selection to a
			// different book on every re-sort.
			getRowId: (book) => book.id,
			// The width settles when the handle is let go. Rewriting it on every
			// frame would re-lay-out every visible row as the mouse moves.
			columnResizeMode: "onEnd",
			state: { columnVisibility, columnSizing, rowSelection },
			onColumnVisibilityChange,
			onColumnSizingChange,
			onRowSelectionChange: setRowSelection,
		},
		// Watching `columnResizing` here would cost the same as above; the handle
		// subscribes to it on its own.
		(state) => ({ columnSizing: state.columnSizing }),
	);

	const selected = table.getSelectedRowModel().rows.map((row) => row.original);

	const actions = useMemo(
		() => ({
			openDetail: onOpenDetail,
			openReader: onOpenReader,
			edit: (book: BookRecord) => setEditing({ id: book.id, open: true }),
		}),
		[onOpenDetail, onOpenReader],
	);

	// A phone has no width to deal columns onto, so it is handed the rows alone
	//.
	const phone = useLayout() === "phone";

	return (
		<RowActions.Provider value={actions}>
			{phone ? (
				<BookRows table={table} onOpenReader={onOpenReader} />
			) : (
				<BookColumns table={table} onOpenReader={onOpenReader} />
			)}

			{/* It leaves the way it came: clearing a selection is an act, and the
          bar blinking out of the page does not read as one. */}
			<Presence>
				{selected.length > 0 && (
					<BookBulkBar
						key="bulk"
						books={selected}
						onClear={() => setRowSelection({})}
					/>
				)}
			</Presence>

			{/* One sheet for the whole table, not one per row: that would be one
          form per row, for every book on the page. It stays mounted once
          opened, so closing plays its way out. */}
			{editing && editingBook && (
				<BookEditDialog
					book={editingBook}
					open={editing.open}
					onOpenChange={(open) =>
						setEditing((current) => current && { ...current, open })
					}
				/>
			)}
		</RowActions.Provider>
	);
}

interface FaceProps {
	table: TableInstance;
	onOpenReader: (book: BookRecord) => void;
}

/** The tick box that means the whole page. */
function selectAll(table: TableInstance, label: string) {
	// Counted from the rows on the page: a selection can still name books a
	// new filter has taken off it.
	const rows = table.getRowModel().rows.length;
	const picked = table.getSelectedRowModel().rows.length;
	const all = rows > 0 && picked === rows;
	return {
		"aria-label": label,
		checked: all,
		indeterminate: picked > 0 && !all,
		onCheckedChange: (checked: boolean) => table.toggleAllRowsSelected(checked),
	};
}

/** The table with its columns: headings that name them, edges that drag. */
function BookColumns({ table, onOpenReader }: FaceProps) {
	const { t } = useTranslation();
	const sort = useLibrary((state) => state.sort);
	const order = useLibrary((state) => state.order);

	return (
		<Table
			className="min-w-full table-fixed"
			style={{ width: table.getTotalSize() }}
		>
			<TableHeader>
				{table.getHeaderGroups().map((group) => (
					<TableRow key={group.id} className="group/row hover:bg-transparent">
						{group.headers.map((header) => {
							const id = header.column.id as ColumnId;
							return (
								<TableHead
									key={header.id}
									aria-sort={ariaSort(id, sort, order)}
									className={cn(
										"font-normal text-muted-foreground",
										stickyClass(id),
									)}
									style={{ width: header.getSize() }}
								>
									{/* Only the label is clipped: clipping the cell would trap
                      the resize handle's line inside the column. */}
									<div className="truncate">
										{id === "select" ? (
											<Checkbox {...selectAll(table, t("table.selectAll"))} />
										) : (
											!COLUMNS[id].fixed && (
												<Heading id={id} sort={sort} order={order} />
											)
										)}
									</div>
									{header.column.getCanResize() && (
										<ResizeHandle table={table} header={header} />
									)}
								</TableHead>
							);
						})}
						{/* Takes up whatever width is left. Without it, hiding a column
                makes every remaining column wider. */}
						<TableHead className="w-auto p-0" />
					</TableRow>
				))}
			</TableHeader>
			<TableBody>
				{table.getRowModel().rows.map((row) => (
					<TableRow
						key={row.id}
						className="group/row h-17"
						data-state={row.getIsSelected() ? "selected" : undefined}
						// A cell's portal still bubbles here through React's tree, so only a
						// double-click on the row itself counts.
						onDoubleClick={(event) => {
							if (!event.currentTarget.contains(event.target as Node)) return;
							onOpenReader(row.original);
						}}
					>
						{row.getVisibleCells().map((cell) => (
							<TableCell
								key={cell.id}
								className={cn(
									"overflow-hidden",
									stickyClass(cell.column.id as ColumnId),
									row.original.missing &&
										cell.column.id !== "select" &&
										"opacity-55",
								)}
							>
								<table.FlexRender cell={cell} />
							</TableCell>
						))}
						<TableCell className="w-auto p-0" />
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

/**
 * The same rows on a phone: the book's own column, which is the one that says
 * which book this is, and beside it the two things read at a glance.
 */
function BookRows({ table, onOpenReader }: FaceProps) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col">
			<label className="flex items-center gap-3 border-border border-b px-1 py-2.5 text-muted-foreground text-xs">
				<Checkbox {...selectAll(table, t("table.selectAll"))} />
				{t("table.selectAll")}
			</label>

			{table.getRowModel().rows.map((row) => (
				<div
					key={row.id}
					data-state={row.getIsSelected() ? "selected" : undefined}
					className={cn(
						"flex items-center gap-3 border-border border-b px-1 py-2.5",
						"transition-colors duration-[var(--dur-quick)] ease-standard data-[state=selected]:bg-accent",
						row.original.missing && "opacity-55",
					)}
					onDoubleClick={() => onOpenReader(row.original)}
				>
					<SelectCell row={row} />
					<div className="min-w-0 flex-1">
						<BookCell book={row.original} />
					</div>
					<RowMarks row={row} />
				</div>
			))}
		</div>
	);
}

/** What the phone's row shows instead of the columns it has no room for. The
 *  marks are read here and set on the book's own screen. */
function RowMarks({ row }: { row: Row<typeof features, BookRecord> }) {
	const book = row.original;

	return (
		<div className="flex shrink-0 flex-col items-end gap-1">
			<span className="flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums">
				<StatusDot status={book.status} />
				{progressPercent(book)}%
			</span>
			<span className="flex items-center gap-1.5">
				{book.favorite && <FavoriteMark />}
				<RatingMark rating={book.rating} />
			</span>
		</div>
	);
}

// TanStack hands an updater or a value; the store only takes values.
function onColumnVisibilityChange(updater: Updater<ColumnVisibilityState>) {
	const { columns, setColumns } = useLibrary.getState();
	setColumns(functionalUpdate(updater, columns));
}

function onColumnSizingChange(updater: Updater<ColumnSizingState>) {
	const { columnSizes, setColumnSizes } = useLibrary.getState();
	setColumnSizes(functionalUpdate(updater, columnSizes));
}

type TableInstance = ReturnType<
	typeof useTable<
		typeof features,
		BookRecord,
		{ columnSizing: ColumnSizingState }
	>
>;

/**
 * The column's right edge. Drag it, double-click to put it back, or nudge it
 * with the arrow keys once it has focus.
 */
function ResizeHandle({
	table,
	header,
}: {
	table: TableInstance;
	header: Header<typeof features, BookRecord>;
}) {
	const { t } = useTranslation();
	const id = header.column.id as ColumnId;

	const resize = (size: number) =>
		table.setColumnSizing((current) => ({
			...current,
			[id]: Math.max(MIN_SIZE, size),
		}));

	const reset = () =>
		table.setColumnSizing((current) => {
			const next = { ...current };
			delete next[id];
			return next;
		});

	return (
		<table.Subscribe selector={(state) => state.columnResizing}>
			{(resizing) => (
				<button
					type="button"
					aria-label={t("table.resizeColumn", { column: columnLabel(id) })}
					className="group/handle absolute inset-y-0 right-0 z-10 flex w-2 cursor-col-resize touch-none items-center justify-center outline-none"
					style={{
						transform:
							resizing.isResizingColumn === id
								? `translateX(${resizing.deltaOffset ?? 0}px)`
								: undefined,
					}}
					data-resizing={resizing.isResizingColumn === id || undefined}
					onMouseDown={header.getResizeHandler()}
					onTouchStart={header.getResizeHandler()}
					onDoubleClick={reset}
					onKeyDown={(event) => {
						if (event.key === "ArrowLeft")
							resize(header.column.getSize() - NUDGE);
						else if (event.key === "ArrowRight")
							resize(header.column.getSize() + NUDGE);
						else return;
						event.preventDefault();
					}}
				>
					<span className="h-full w-px bg-transparent transition-colors duration-[var(--dur-quick)] ease-standard group-hover/handle:bg-ring group-focus-visible/handle:bg-ring group-data-resizing/handle:bg-ring" />
				</button>
			)}
		</table.Subscribe>
	);
}

function ariaSort(
	column: ColumnId,
	sort: SortKey,
	order: SortOrder,
): "ascending" | "descending" | "none" | undefined {
	if (COLUMNS[column].fixed) return undefined;
	if (!sortsOf(column).includes(sort)) return "none";
	return order === "asc" ? "ascending" : "descending";
}

/**
 * A heading names its column, and while the shelf is standing on one of that
 * column's fields it names the field instead. It does not sort: the shelf is
 * put in order from the bar, where both faces reach the same list
 *.
 */
function Heading({
	id,
	sort,
	order,
}: {
	id: ColumnId;
	sort: SortKey;
	order: SortOrder;
}) {
	const active = sortsOf(id).includes(sort);

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1",
				active && "text-foreground",
			)}
		>
			{active ? fieldLabel(sort) : columnLabel(id)}
			{active && <SortMark order={order} />}
		</span>
	);
}

/** Which way the order this column holds runs. */
function SortMark({ order }: { order: SortOrder }) {
	return order === "desc" ? (
		<ArrowDownIcon className="size-3" />
	) : (
		<ArrowUpIcon className="size-3" />
	);
}
