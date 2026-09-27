// Books on their way into this browser, and taking them out again.

import { create } from "zustand";
import type { BookRecord } from "@/features/shelf/types";
import { bookFileUrl, coverUrl } from "@/features/shelf/urls";
import { t } from "@/i18n";
import { showAlert, showNotice } from "@/store/alert";
import { invalidateSaved } from "./queries";
import { removeSaved, SaveFailed, saveBook } from "./storage";

interface SavingState {
	/** How far along each book being saved is, by id. */
	progress: Record<string, number>;
	save: (shelfId: string, record: BookRecord) => Promise<void>;
	cancel: (id: string) => void;
	remove: (id: string) => Promise<void>;
}

const cancels = new Map<string, () => void>();

function setProgress(
	set: (fn: (state: SavingState) => Partial<SavingState>) => void,
	id: string,
	fraction: number | undefined,
) {
	set((state) => {
		const progress = { ...state.progress };
		if (fraction === undefined) delete progress[id];
		else progress[id] = fraction;
		return { progress };
	});
}

export const useSaving = create<SavingState>((set, get) => ({
	progress: {},

	async save(shelfId, record) {
		const { id } = record;
		if (get().progress[id] !== undefined) return;
		setProgress(set, id, 0);
		// Asked once, so the browser does not clear the books to make room.
		void navigator.storage.persist?.().catch(() => false);
		// Fetched through the service worker, which keeps covers.
		const cover = coverUrl(record);
		if (cover) void fetch(cover).catch(() => undefined);

		const job = saveBook(
			{ shelfId, record, savedAt: new Date().toISOString() },
			bookFileUrl(id),
			(fraction) => setProgress(set, id, fraction),
		);
		cancels.set(id, job.cancel);
		try {
			await job.done;
			showNotice(t("offline.saved", { title: record.title }));
		} catch (error) {
			if (!(error instanceof SaveFailed && error.cancelled)) {
				showAlert(
					t("offline.saveFailed", {
						message: error instanceof Error ? error.message : String(error),
					}),
				);
			}
		} finally {
			cancels.delete(id);
			setProgress(set, id, undefined);
			await invalidateSaved();
		}
	},

	cancel(id) {
		cancels.get(id)?.();
	},

	async remove(id) {
		try {
			await removeSaved(id);
		} catch (error) {
			showAlert(
				t("offline.removeFailed", {
					message: error instanceof Error ? error.message : String(error),
				}),
			);
		}
		await invalidateSaved();
	},
}));
