// What can be done to the books that are ticked.

import { Button } from "@registrum/ui/components/button";
import { Separator } from "@registrum/ui/components/separator";
import { XIcon } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { useTranslation } from "react-i18next";
import { Confirm } from "@/components/confirm";
import { useOpenRule } from "@/features/rule/use-open-rule";
import { useRetainedValue } from "@/features/shelf/hooks/use-retained-value";
import { useClearPosition, useRemoveBooks } from "@/features/shelf/mutations";
import { useShelfStore } from "@/features/shelf/store";
import type { BookRecord } from "@/features/shelf/types";
import { BookBulkEditDialog } from "./book-bulk-edit-dialog";

/** A pill floating over the shelf is the same kind of surface as the reader's,
 *  so it is painted by the same rule. It is only as wide as what it carries
 *  and stands in the middle of the shelf. */
const SURFACE =
	"motion-dock chrome-surface sticky bottom-[calc(0.75rem+var(--safe-bottom))] z-30 mx-auto mt-3 flex w-fit items-center gap-2.5 rounded-xl py-2 pr-2 pl-3.5 phone:w-full phone:flex-wrap";

/** The three that ask before they go. */
type Asked = "remove" | "rescan" | "clearPosition";

/** What can be done to the books that are ticked. */
export function BookBulkBar({
	books,
	onClear,
}: {
	books: BookRecord[];
	onClear: () => void;
}) {
	const { t } = useTranslation();
	const rescan = useShelfStore((state) => state.rescan);
	const removeBooks = useRemoveBooks();
	const clearPosition = useClearPosition();
	const openRule = useOpenRule();
	const [editing, setEditing] = useState(false);
	const [confirming, setConfirming] = useState<Asked | null>(null);
	const shown = useRetainedValue(confirming !== null, confirming);

	const ids = books.map((book) => book.id);
	const count = books.length;
	/** Each of the three asks first, then clears the selection and goes. */
	const confirms: Record<
		Asked,
		Omit<ComponentProps<typeof Confirm>, "open" | "onOpenChange">
	> = {
		rescan: {
			title: t("bulk.rescanTitle", { count }),
			description: t("book.rescanDescription"),
			confirmLabel: t("book.rescanConfirm"),
			destructive: false,
			onConfirm: () => {
				done();
				void rescan(ids);
			},
		},
		clearPosition: {
			title: t("bulk.clearPositionTitle", { count }),
			description: t("history.clearDescription"),
			confirmLabel: t("history.clearConfirm"),
			onConfirm: () => {
				done();
				clearPosition.mutate(ids);
			},
		},
		remove: {
			title: t("bulk.removeTitle", { count }),
			description: t("book.removeDescription"),
			confirmLabel: t("common.delete"),
			onConfirm: () => {
				done();
				// The rows leave the table at once. Nothing to wait on and nothing to
				// draw: what a deletion looks like is the books being gone.
				removeBooks.mutate(ids);
			},
		},
	};
	function done() {
		setConfirming(null);
		onClear();
	}

	return (
		<div className={SURFACE}>
			<span className="text-sm tabular-nums">
				{t("bulk.selected", { count: books.length })}
			</span>
			{/* What is selected, and then what can be done to it. The line says the
          count is not one of the buttons. */}
			<Separator orientation="vertical" className="phone:hidden h-5" />

			<div className="flex phone:w-full phone:flex-wrap items-center gap-2">
				{/* One filled button and no others: with a single strong shape there is
            nothing to work out about which one is the way on. */}
				<Button onClick={() => setEditing(true)}>{t("bulk.edit")}</Button>
				<Button variant="outline" onClick={() => openRule(ids)}>
					{t("rule.fromSelection")}
				</Button>
				<Button variant="outline" onClick={() => setConfirming("rescan")}>
					{t("book.rescan")}
				</Button>
				<Button
					variant="outline"
					onClick={() => setConfirming("clearPosition")}
				>
					{t("bulk.clearPosition")}
				</Button>
				{/* Red where it is written, not only where it is confirmed: the same
            wording and the same colour as the one on a book's own screen. */}
				<Button
					variant="outline"
					className="text-destructive hover:bg-destructive/10 hover:text-destructive"
					onClick={() => setConfirming("remove")}
				>
					{t("common.delete")}
				</Button>
				<Button
					variant="ghost"
					size="icon"
					aria-label={t("bulk.clearSelection")}
					className="ml-auto text-muted-foreground"
					onClick={onClear}
				>
					<XIcon />
				</Button>
			</div>

			<BookBulkEditDialog
				books={books}
				open={editing}
				onOpenChange={setEditing}
				onDone={onClear}
			/>

			{/* One dialog for the three, which keeps its words on its way out. */}
			<Confirm
				open={confirming !== null}
				onOpenChange={(open) => !open && setConfirming(null)}
				{...confirms[shown ?? "rescan"]}
			/>
		</div>
	);
}
