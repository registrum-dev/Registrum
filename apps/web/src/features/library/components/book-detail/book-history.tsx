// What this library knows about reading this book.

import { useTranslation } from "react-i18next";

import { shortDate, statusLabel } from "@/features/library/labels";
import { type BookRecord, progressPercent } from "@/features/library/types";
import { Row } from "./detail-parts";

/** The reading tab: what this library actually knows about reading this book. */
export function BookHistory({ book }: { book: BookRecord }) {
	const { t } = useTranslation();
	const percent = progressPercent(book);

	return (
		<div className="flex flex-col gap-3">
			{/* The same rows the bibliography is made of: four dates and a
          percentage are not five figures worth tiling. */}
			<div className="grid grid-cols-1">
				<Row label={t("field.status")} value={statusLabel(book.status)} />
				<Row label={t("field.progress")} value={`${percent}%`} numeric />
				<Row
					label={t("field.lastOpened")}
					value={shortDate(book.lastOpenedAt)}
					numeric
				/>
				<Row
					label={t("history.positionSaved")}
					value={shortDate(book.progress?.updatedAt ?? null)}
					numeric
				/>
				<Row
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
