// The shelf's own state: which shelf is open in this browser, what it is asked
// for, and what is running on it.

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
	type ColumnSizing,
	type ColumnVisibility,
	DEFAULT_COLUMN_VISIBILITY,
	defaultOrder,
	type LibraryView,
	normalizeSizing,
	normalizeVisibility,
	type SortKey,
	type SortOrder,
} from "@/features/library/columns";
import { DEFAULT_PAGE_SIZE, type PageSize } from "@/features/library/paging";
import {
	parseRemembered,
	type Remembered,
	remembered,
} from "@/features/library/preferences";
import { type LibraryQuery, mergeQuery } from "@/features/library/query";
import {
	type Run,
	restoreBooks,
	type ScanState,
	scanFolder,
} from "@/features/library/scan";
import { t } from "@/i18n";
import { api, trpc } from "@/lib/api";
import { preferences } from "@/lib/persist";
import { queryClient } from "@/lib/query";
import { reportFailure, showAlert } from "@/store/alert";

const STORE_KEY = "library";

export interface LibraryState {
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
	query: LibraryQuery;
	sort: SortKey;
	order: SortOrder;
	view: LibraryView;
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
	setQuery: (patch: LibraryQuery) => void;
	clearQuery: () => void;

	/** Without an order, the field's own default order. */
	setSort: (sort: SortKey, order?: SortOrder) => void;
	setView: (view: LibraryView) => void;
	setPage: (page: number) => void;
	/** A page of another size is a shelf dealt out again, so it starts at one. */
	setPageSize: (size: PageSize) => void;
	setColumns: (columns: ColumnVisibility) => void;
	setColumnSizes: (sizes: ColumnSizing) => void;

	/** Reads the books again and drops the hand edits: the restore command. */
	restore: (ids: string[]) => Promise<void>;
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
	query: {},
	scan: null,
	busy: "idle",
	walked: false,
} as const;

export const useLibrary = create<LibraryState>()(
	persist<LibraryState, [], [], Remembered>(
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
				// A different shelf is a different library: nothing of the old one is
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
					set({ opened: true });
				} catch (error) {
					if (token !== attempt) return;
					set({ openFailed: true });
					reportFailure(error, "loadLibrary");
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
			setQuery(patch) {
				set((state) => ({ query: mergeQuery(state.query, patch), page: 0 }));
			},

			clearQuery() {
				set({ query: {}, page: 0 });
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

			async restore(ids) {
				const { shelfId } = get();
				if (!shelfId) return;

				const token = ++attempt;
				set({
					busy: "scanning",
					scan: { done: 0, total: ids.length, title: "" },
				});
				await restoreBooks(shelfId, ids, watch(token, set));
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

/**
 * Makes whatever is running irrelevant, and tells the server to stop reading if
 * a run is what it was: the books it would go on to read belong to a shelf
 * nobody is looking at any more.
 */
function abandon(state: LibraryState): void {
	dropRun(state.busy === "scanning" ? state.shelfId : null);
}

/** Leaves whatever is running behind, and stops the server's run on this
 *  shelf, if one is named. */
function dropRun(shelfId: string | null): void {
	attempt += 1;
	if (shelfId) void api.library.cancelScan.mutate({ shelfId });
}

/** How a run reaches the shelf, and how it learns it is no longer the one. */
function watch(
	token: number,
	set: (patch: Partial<LibraryState>) => void,
): Run {
	return { running: () => token === attempt, report: (scan) => set({ scan }) };
}
