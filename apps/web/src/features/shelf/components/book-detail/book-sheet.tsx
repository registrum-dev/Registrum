// The book's detail as a sheet over the shelf.

import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { SheetSurface } from "@/components/phone-sheet";
import { useRetainedValue } from "@/features/shelf/hooks/use-retained-value";
import { BookDetail } from "./book-detail";

/**
 * The detail, risen from the bottom edge. The router says when it comes and
 * goes, so it is not a dialog: the phone's back gesture walks the history.
 */
export function BookSheet({
	open,
	id,
	appear,
}: {
	open: boolean;
	id: string | undefined;
	appear: boolean;
}) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const toShelf = useCallback(() => void navigate({ to: "/" }), [navigate]);
	// On its way out the route no longer names the book; it leaves showing the last one.
	const shown = useRetainedValue(Boolean(id), id);

	return (
		<SheetSurface
			open={open}
			kind="page"
			label={t("detail.sheet")}
			modal={false}
			appear={appear}
			onClose={toShelf}
			// Wide enough for the book and its record side by side.
			className="max-w-[72rem]"
		>
			<BookDetail id={shown} />
		</SheetSurface>
	);
}
