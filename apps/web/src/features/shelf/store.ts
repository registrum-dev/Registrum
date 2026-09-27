// The shelf's own state: which shelf is open in this browser, what it is asked
// for, and what is running on it.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { sendPositions } from "@/features/offline/pending-positions";
import {
	type ColumnSizing,
	type ColumnVisibility,
	DEFAULT_COLUMN_VISIBILITY,
	defaultOrder,
	normalizeSizing,
	normalizeVisibility,
	type ShelfView,
	type SortKey,
	type SortOrder,
} from "@/features/shelf/columns";
import { type BookFilter, mergeFilter } from "@/features/shelf/filter";
import { DEFAULT_PAGE_SIZE, type PageSize } from "@/features/shelf/paging";
import {
	parseRemembered,
	type Remembered,
	remembered,
} from "@/features/shelf/preferences";
import {
	type Run,
	rescanBooks,
	type ScanState,
	scanFolder,
} from "@/features/shelf/scan";
import { t } from "@/i18n";
import { api, trpc } from "@/lib/api";
import { moveKey, preferences } from "@/lib/persist";
import { queryClient } from "@/lib/query-client";
import { isUnreachable } from "@/lib/reachability";
import { reportFailure, showAlert } from "@/store/alert";

const STORE_KEY = "shelf";

moveKey("library", STORE_KEY, (stored) => {
	if (!stored || typeof stored !== "object" || !("query" in stored)) {
		return stored;
	}
	const { query, ...rest } = stored as Record<string, unknown>;
	return { ...rest, filter: query };
});

export interface ShelfState {
	/** The shelf this browser is looking at, or null until one is chosen. */
	shelfId: string | null;
	/** Whether that shelf has been found and may now be questioned. */
	opened: boolean;
	/**
	 * Whether the last attempt to open it did not work -- the server did not
	 * answer. The shelf draws this instead of waiting on an answer that is not
	 * coming.
	 */
	openFailed: boolean;
	/** What the shelf is being asked for: the search box and the filter bar. */
	filter: BookFilter;
	sort: SortKey;
	order: SortOrder;
	view: ShelfView;
	/** Which page of the shelf is on screen, counted from zero. */
	page: number;
	/** How many books a page of it holds. */
	pageSize: PageSize;
	columns: ColumnVisibility;
	columnSizes: ColumnSizing;
	/** What the shelf is taken up with, if anything. */
	busy: "idle" | "loading" | "scanning";
	scan: ScanState | null;
	/**
	 * Whether the folder has been walked in this session. Only consulted when
	 * there is nothing on the shelf, to tell "not looked yet" from "looked, and
	 * there are no books here" -- two very different things to be told.
	 */
	walked: boolean;
	hydrated: boolean;

	/** Makes a folder a shelf, named as the reader named it, and opens it. */
	createShelf: (folder: string, name: string) => Promise<void>;
	/** Swaps over to a shelf that already exists. */
	switchTo: (shelfId: string) => Promise<void>;
	/** Puts the first screen back. */
	leaveShelf: () => void;
	/** Finds the shelf, which is what lets everything else be asked for. Also
	 *  how what this browser remembered is opened again, if it is still there. */
	load: () => Promise<void>;
	/** Walks the folder and reads the books the shelf does not know yet. */
	startScan: () => Promise<void>;
	cancelScan: () => void;

	/** Adds or removes conditions; a field set to undefined is taken off. */
	setFilter: (patch: BookFilter) => void;
	clearFilter: () => void;

	/** Without an order, the field's own default order. */
	setSort: (sort: SortKey, order?: SortOrder) => void;
	setView: (view: ShelfView) => void;
	setPage: (page: number) => void;
	/** A page of another size is a shelf dealt out again, so it starts at one. */
	setPageSize: (size: PageSize) => void;
	setColumns: (columns: ColumnVisibility) => void;
	setColumnSizes: (sizes: ColumnSizing) => void;

	/** Reads the books again and drops the hand edits: the rescan command. */
	rescan: (ids: string[]) => Promise<void>;
}

/**
 * Bumped by anything that makes what is running irrelevant -- cancelling a scan,
 * choosing another shelf, opening one again. A run's progress and its answer
 * are dropped once it is behind.
 */
let attempt = 0;

/** Nothing open: no shelf, no conditions, nothing running. */
const NO_SHELF = {
	shelfId: null,
	opened: false,
	openFailed: false,
	filter: {},
	scan: null,
	busy: "idle",
	walked: false,
} as const;

export const useShelfStore = create<ShelfState>()(
	persist<ShelfState, [], [], Remembered>(
		(set, get) => ({
			...NO_SHELF,
			sort: "lastOpened",
			order: "desc",
			view: "grid",
			page: 0,
			pageSize: DEFAULT_PAGE_SIZE,
			columns: DEFAULT_COLUMN_VISIBILITY,
			columnSizes: {},
			hydrated: false,

			async createShelf(folder: string, name: string) {
				set({ busy: "loading" });
				let made: string;
				try {
					made = (await api.shelf.create.mutate({ path: folder, name })).id;
				} catch (error) {
					// Nothing was made, so the reader is left on the same step and may
					// name it something the server will take.
					set({ busy: "idle" });
					reportFailure(error, "shelfName");
					return;
				}
				void queryClient.invalidateQueries({
					queryKey: trpc.shelf.list.queryKey(),
				});
				await get().switchTo(made);
			},

			async switchTo(shelfId: string) {
				// A different shelf is a different set of books: nothing of the old one is
				// shown while the new one loads. Conditions are about the books on this
				// shelf -- a series or a collection the new one has never heard of.
				abandon(get());
				set({ ...NO_SHELF, shelfId });
				await get().load();
			},

			leaveShelf() {
				abandon(get());
				set(NO_SHELF);
			},

			/**
			 * Finds the shelf, after which everything else may be asked of it. One
			 * that is no longer a shelf is forgotten and the first screen asks for
			 * one again.
			 */
			async load() {
				const { shelfId } = get();
				if (!shelfId) return;

				const token = ++attempt;
				set({ busy: "loading", opened: false, openFailed: false });
				try {
					const shelves = await api.shelf.list.query();
					queryClient.setQueryData(trpc.shelf.list.queryKey(), shelves);
					if (token !== attempt) return;
					if (!shelves.some((shelf) => shelf.id === shelfId)) {
						set(NO_SHELF);
						showAlert(t("error.noShelf"));
						return;
					}
					// Before the shelf is asked for, so it shows where the reader got to
					// while the server was away.
					await sendPositions();
					if (token !== attempt) return;
					set({ opened: true });
				} catch (error) {
					if (token !== attempt) return;
					set({ openFailed: true });
					// The shelf says so itself, and offers what was saved here instead.
					if (!isUnreachable(error)) reportFailure(error, "loadShelf");
				} finally {
					if (token === attempt) set({ busy: "idle" });
				}
			},

			async startScan() {
				const { shelfId } = get();
				if (!shelfId) return;

				const token = ++attempt;
				set({ busy: "scanning", scan: null });
				await scanFolder(shelfId, watch(token, set), () =>
					set({ walked: true }),
				);
				if (token === attempt) set({ busy: "idle", scan: null });
			},

			cancelScan() {
				// The server stops between books; the run then answers, and what did
				// land before the stop is asked for by the run itself (scan.ts).
				dropRun(get().shelfId);
				set({ busy: "idle", scan: null });
			},

			// None of these re-asks for the shelf: what is asked is part of the name
			// the answer is filed under. All of them stand the reader on the first
			// page: page 7 of one shelf is not page 7 of the next.
			setFilter(patch) {
				set((state) => ({ filter: mergeFilter(state.filter, patch), page: 0 }));
			},

			clearFilter() {
				set({ filter: {}, page: 0 });
			},

			setSort(sort, order) {
				set({ sort, order: order ?? defaultOrder(sort), page: 0 });
			},

			setView(view) {
				set({ view });
			},

			setPage(page) {
				set({ page });
			},

			setPageSize(pageSize) {
				set({ pageSize, page: 0 });
			},

			setColumns(columns) {
				set({ columns: normalizeVisibility(columns) });
			},

			setColumnSizes(columnSizes) {
				set({ columnSizes: normalizeSizing(columnSizes) });
			},

			async rescan(ids) {
				const { shelfId } = get();
				if (!shelfId) return;

				const token = ++attempt;
				set({
					busy: "scanning",
					scan: { done: 0, total: ids.length, title: "" },
				});
				await rescanBooks(shelfId, ids, watch(token, set));
				if (token === attempt) set({ busy: "idle", scan: null });
			},
		}),
		{
			name: STORE_KEY,
			partialize: remembered,
			storage: preferences<Remembered>(),
			// Called once whether or not anything was stored, which is what makes it
			// the place `hydrated` is set.
			merge: (stored, current) => ({
				...current,
				...parseRemembered(stored),
				hydrated: true,
			}),
			onRehydrateStorage: () => (state) => {
				if (state?.shelfId) void state.load();
			},
		},
	),
);

// A shelf that could not be opened is tried again once the network is back.
window.addEventListener("online", () => {
	const { openFailed, load } = useShelfStore.getState();
	if (openFailed) void load();
});

/**
 * Makes whatever is running irrelevant, and tells the server to stop reading if
 * a run is what it was: the books it would go on to read belong to a shelf
 * nobody is looking at any more.
 */
function abandon(state: ShelfState): void {
	dropRun(state.busy === "scanning" ? state.shelfId : null);
}

/** Leaves whatever is running behind, and stops the server's run on this
 *  shelf, if one is named. */
function dropRun(shelfId: string | null): void {
	attempt += 1;
	if (shelfId) void api.book.stopScan.mutate({ shelfId });
}

/** How a run reaches the shelf, and how it learns it is no longer the one. */
function watch(token: number, set: (patch: Partial<ShelfState>) => void): Run {
	return { running: () => token === attempt, report: (scan) => set({ scan }) };
}
