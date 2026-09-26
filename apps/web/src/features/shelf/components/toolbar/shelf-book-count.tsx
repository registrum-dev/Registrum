// The left end of the shelf bar.

import { useTranslation } from "react-i18next";

import { useFacets } from "@/features/shelf/queries";

/** How many books are shown, out of how many the shelf holds. */
export function ShelfBookCount({ shown }: { shown: number }) {
	const { t } = useTranslation();
	const total = useFacets().total;

	return (
		<span className="flex shrink-0 items-center ps-1.5 text-muted-foreground text-xs tabular-nums">
			{shown === total
				? t("common.bookCount", { count: total })
				: t("shelf.shownOfTotal", { shown, total })}
		</span>
	);
}
