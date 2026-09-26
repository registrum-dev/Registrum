// The order picker on the shelf bar.

import { Button } from "@Registrum/ui/components/button";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@Registrum/ui/components/toggle-group";
import { cn } from "@Registrum/ui/lib/utils";
import { ArrowDownIcon, ArrowDownUpIcon, ArrowUpIcon } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	CHOICE_GROUP,
	CHOICE_ITEM,
	ChoiceMark,
} from "@/components/choice-mark";
import {
	PhoneSheet,
	SheetBar,
	SheetMenu,
	SheetMenuItem,
} from "@/components/phone-sheet";
import {
	fieldLabel,
	SORT_ORDERS,
	type SortKey,
	type SortOrder,
} from "@/features/library/columns";
import { useLibrary } from "@/features/library/store";

/** The fields worth offering in the picker. */
const SORTS = [
	"lastOpened",
	"title",
	"author",
	"series",
	"rating",
	"added",
] as const satisfies readonly SortKey[];

const ARROWS: Record<SortOrder, string> = { asc: "↑", desc: "↓" };

const SORT_TRIGGER =
	"shrink-0 rounded-xl border-border bg-card px-3.5 font-medium hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50";

/** The order, chosen from a menu that rises: the field first, then which way
 *  round it runs. */
export function SortMenu() {
	const { t } = useTranslation();
	const sort = useLibrary((state) => state.sort);
	const order = useLibrary((state) => state.order);
	const setSort = useLibrary((state) => state.setSort);
	const [open, setOpen] = useState(false);
	const mark = useId();

	const offered: readonly SortKey[] = SORTS;
	const fields = offered.includes(sort) ? offered : [...offered, sort];

	return (
		<>
			<Button
				variant="outline"
				aria-label={t("library.sortOrder")}
				onClick={() => setOpen(true)}
				className={cn(SORT_TRIGGER, "h-10 min-w-0 shrink gap-1.5")}
			>
				<ArrowDownUpIcon />
				<span className="truncate">{`${fieldLabel(sort)} ${ARROWS[order]}`}</span>
			</Button>
			<PhoneSheet
				open={open}
				onOpenChange={setOpen}
				kind="fit"
				label={t("library.sortOrder")}
			>
				<SheetBar
					title={t("library.sortOrder")}
					onClose={() => setOpen(false)}
					className="border-b-0"
				/>
				<SheetMenu>
					{fields.map((field) => (
						<SheetMenuItem
							key={field}
							checked={field === sort}
							onClick={() => {
								if (field !== sort) setSort(field);
							}}
						>
							{fieldLabel(field)}
						</SheetMenuItem>
					))}
				</SheetMenu>
				<div className="px-3 pb-3">
					<ToggleGroup
						value={[order]}
						onValueChange={(value) => {
							const next = value[0] as SortOrder | undefined;
							if (next) setSort(sort, next);
						}}
						aria-label={t("library.sortDirection")}
						className={cn(
							CHOICE_GROUP,
							"w-full rounded-xl border border-border bg-card p-1",
						)}
					>
						{SORT_ORDERS.map((next) => (
							<ToggleGroupItem
								key={next}
								value={next}
								className={cn("h-9 flex-1 font-normal", CHOICE_ITEM)}
							>
								{next === order && <ChoiceMark id={mark} />}
								{next === "asc" ? <ArrowUpIcon /> : <ArrowDownIcon />}
								{t(`order.${next}`)}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
				</div>
			</PhoneSheet>
		</>
	);
}
