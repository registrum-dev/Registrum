// The left end of the shelf bar.

import { useTranslation } from "react-i18next";

import { useFacets } from "@/features/library/queries";

/** How many books are on the shelf, out of how many the library holds. */
export function ShelfBarLead({ shown }: { shown: number }) {
	const { t } = useTranslation();
	const total = useFacets().total;

	return (
		<span className="flex shrink-0 items-center ps-1.5 text-muted-foreground text-xs tabular-nums">
			{shown === total
				? t("common.bookCount", { count: total })
				: t("library.shownOfTotal", { shown, total })}
		</span>
	);
}
