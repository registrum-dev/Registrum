// The two long runs, followed from here while the server does them: reading the
// folder's new books, and reading books again.

import { t } from "@/i18n";
import { api } from "@/lib/api";
import { reportFailure, showAlert } from "@/store/alert";

import { libraryChanged } from "./cache";
import { onScanProgress, type ScanReport } from "./ipc";

export interface ScanState {
	done: number;
	total: number;
	/** The book being read right now, so a long run says what it is doing. */
	title: string;
}

/** How a run reaches the shelf: what it is doing, and whether it still matters. */
export interface Run {
	/** Whether this run is still the one the reader started. */
	running: () => boolean;
	report: (scan: ScanState | null) => void;
}

/** Brings the library in line with the folder. Started by the reader, never on its own. */
export async function scanFolder(
	shelfId: string,
	run: Run,
	walked: () => void,
): Promise<void> {
	const report = await follow(shelfId, run, walked, () =>
		api.library.scan.mutate({ shelfId }),
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
export async function restoreBooks(
	shelfId: string,
	ids: string[],
	run: Run,
): Promise<void> {
	const report = await follow(
		shelfId,
		run,
		() => {},
		() => api.library.restore.mutate({ shelfId, ids }),
	);
	if (!report || !run.running()) return;
	if (report.failed.length) {
		showAlert(
			t("error.restoreFailed", {
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
		void libraryChanged(shelfId);
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
