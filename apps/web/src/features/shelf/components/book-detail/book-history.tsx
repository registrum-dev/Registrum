// What this shelf knows about reading this book.

import { useTranslation } from "react-i18next";

import { shortDate, statusLabel } from "@/features/shelf/labels";
import { type BookRecord, progressPercent } from "@/features/shelf/types";
import { DetailRow } from "./detail-parts";

/** The reading tab: what this shelf actually knows about reading this book. */
export function BookHistory({ book }: { book: BookRecord }) {
	const { t } = useTranslation();
	const percent = progressPercent(book);

	return (
		<div className="flex flex-col gap-3">
			{/* The same rows the bibliography is made of: four dates and a
          percentage are not five figures worth tiling. */}
			<div className="grid grid-cols-1">
				<DetailRow label={t("field.status")} value={statusLabel(book.status)} />
				<DetailRow label={t("field.progress")} value={`${percent}%`} numeric />
				<DetailRow
					label={t("field.lastOpened")}
					value={shortDate(book.lastOpenedAt)}
					numeric
				/>
				<DetailRow
					label={t("history.positionSaved")}
					value={shortDate(book.position?.updatedAt ?? null)}
					numeric
				/>
				<DetailRow
					label={t("history.added")}
					value={shortDate(book.addedAt)}
					numeric
				/>
			</div>

			{/* Where the bookmark is sits beside the cover, under the progress bar,
          where it is read together with the percentage it belongs to. */}
			<p className="text-muted-foreground text-xs leading-relaxed">
				{t("history.note")}
			</p>
		</div>
	);
}
