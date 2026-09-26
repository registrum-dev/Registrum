// The two long runs, followed from here while the server does them: reading the
// folder's new books, and reading books again.

import type { ScanProgress } from "@registrum/api/types";

import { t } from "@/i18n";
import { api } from "@/lib/api";
import { reportFailure, showAlert } from "@/store/alert";

import { invalidateShelf } from "./cache";
import type { ScanReport } from "./types";

export interface ScanState {
	done: number;
	total: number;
	/** The book being read right now, so a long run says what it is doing. */
	title: string;
}

/** How far the run on this shelf has got. Resolves once the server is
 *  listening, so that nothing said after the run starts is missed. */
export function onScanProgress(
	shelfId: string,
	heard: (progress: ScanProgress) => void,
): Promise<() => void> {
	return new Promise((resolve) => {
		let settled = false;
		const listening = api.book.onScanProgress.subscribe(
			{ shelfId },
			{
				onStarted: () => {
					settled = true;
					resolve(() => listening.unsubscribe());
				},
				onData: heard,
				onError: () => {
					if (!settled) resolve(() => listening.unsubscribe());
				},
			},
		);
	});
}

/** How a run reaches the shelf: what it is doing, and whether it still matters. */
export interface Run {
	/** Whether this run is still the one the reader started. */
	running: () => boolean;
	report: (scan: ScanState | null) => void;
}

/** Brings the shelf in line with the folder. Started by the reader, never on its own. */
export async function scanFolder(
	shelfId: string,
	run: Run,
	walked: () => void,
): Promise<void> {
	const report = await follow(shelfId, run, walked, () =>
		api.book.scan.mutate({ shelfId }),
	);
	if (!report || !run.running()) return;
	// The walk is over, so from here the shelf is a true picture of the folder.
	walked();
	if (report.failed.length) {
		showAlert(
			t("error.indexFailed", {
				count: report.failed.length,
				books: nameList(report.failed),
			}),
		);
	}
}

/** Reads the books again, forgetting what was typed over them. */
export async function rescanBooks(
	shelfId: string,
	ids: string[],
	run: Run,
): Promise<void> {
	const report = await follow(
		shelfId,
		run,
		() => {},
		() => api.book.rescan.mutate({ shelfId, ids }),
	);
	if (!report || !run.running()) return;
	if (report.failed.length) {
		showAlert(
			t("error.rescanFailed", {
				count: report.failed.length,
				books: nameList(report.failed),
			}),
		);
	}
}

/**
 * Starts one run and relays its progress to the shelf until it ends. Whether
 * or not it was still wanted by then, the shelf is asked again: part of the
 * folder may have landed before the reader stopped it.
 */
async function follow(
	shelfId: string,
	run: Run,
	started: () => void,
	start: () => Promise<ScanReport>,
): Promise<ScanReport | null> {
	let begun = false;
	const off = await onScanProgress(shelfId, ({ done, total, title }) => {
		if (!run.running()) return;
		if (!begun) started();
		begun = true;
		run.report({ done, total, title });
	});
	try {
		return await start();
	} catch (error) {
		if (run.running()) reportFailure(error, "readFolder");
		return null;
	} finally {
		off();
		void invalidateShelf(shelfId);
	}
}

/** How many names a failure lists before it stops and counts the rest. */
const NAMES_SHOWN = 3;

/** The books a run could not read, as one line. */
function nameList(names: string[]): string {
	const shown = names.slice(0, NAMES_SHOWN).join(t("common.listSeparator"));
	const rest = names.length - NAMES_SHOWN;
	return rest > 0
		? `${shown}${t("common.listSeparator")}${t("error.andMore", { count: rest })}`
		: shown;
}
