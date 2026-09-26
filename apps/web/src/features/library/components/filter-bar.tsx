// The filter: one strip under the shelf bar.

import { Button } from "@Registrum/ui/components/button";
import { Toggle } from "@Registrum/ui/components/toggle";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@Registrum/ui/components/toggle-group";
import { cn } from "@Registrum/ui/lib/utils";
import { FileXIcon, HeartIcon, XIcon } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	CHOICE_GROUP,
	CHOICE_ITEM,
	ChoiceMark,
} from "@/components/choice-mark";
import { useFacets } from "@/features/library/queries";
import {
	isFiltered,
	LIST_FIELDS,
	type ListField,
	listPatch,
	listValues,
} from "@/features/library/query";
import { useLibrary } from "@/features/library/store";
import type { BookStatus } from "@/features/library/types";
import { FilterSheet } from "./filter-sheet";

/** The states of reading in the order the shelf is used in, after "all". */
const STATUSES = [
	"reading",
	"unread",
	"finished",
] as const satisfies readonly BookStatus[];
const ALL = "all";

/**
 * The shelf's conditions, all of them in sight. State and favourites are
 * pressed where they stand; every list opens a sheet.
 */
export function FilterBar() {
	const { t } = useTranslation();
	const query = useLibrary((state) => state.query);
	const setQuery = useLibrary((state) => state.setQuery);
	const clearQuery = useLibrary((state) => state.clearQuery);
	const facets = useFacets();
	// The sheet keeps the list it was opened on through its way out.
	const [field, setField] = useState<ListField | null>(null);
	const [open, setOpen] = useState(false);

	const show = (next: ListField) => {
		setField(next);
		setOpen(true);
	};

	return (
		<div className="flex flex-col gap-2 pb-2.5">
			{/* A narrow bar gives the states a row of their own; a wide one puts
          them at the head of the strip. */}
			<div className="@3xl:hidden px-3">
				<StatusChoice counted={false} className="w-full [&>*]:flex-1" />
			</div>

			<div
				role="toolbar"
				aria-label={t("filter.title")}
				className="flex @3xl:flex-wrap items-center gap-1.5 @3xl:overflow-visible overflow-x-auto px-3 @3xl:ps-3 @3xl:pe-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
			>
				<div className="@3xl:contents hidden">
					<StatusChoice counted />
				</div>

				<Toggle
					variant="outline"
					pressed={query.favorite === true}
					onPressedChange={(pressed) =>
						setQuery({ favorite: pressed ? true : undefined })
					}
					className="h-8 phone:h-9 shrink-0 gap-1.5 rounded-lg bg-card px-2.5 font-normal text-[13px] aria-pressed:[&_svg]:fill-current"
				>
					<HeartIcon />
					{t("shelf.favorite")}
				</Toggle>

				<span
					aria-hidden
					className="mx-1 @3xl:block hidden h-5 w-px shrink-0 bg-border"
				/>

				{LIST_FIELDS.map((list) => (
					<ListButton
						key={list}
						field={list}
						values={listValues(query, list)}
						open={open && field === list}
						onOpen={() => show(list)}
						onClear={() => setQuery(listPatch(list, []))}
					/>
				))}

				{(facets.missing > 0 || query.missing) && (
					<Toggle
						variant="outline"
						pressed={query.missing === true}
						onPressedChange={(pressed) =>
							setQuery({ missing: pressed ? true : undefined })
						}
						title={t("filter.missingHint")}
						className="h-8 phone:h-9 shrink-0 gap-1.5 rounded-lg bg-card px-2.5 font-normal text-[13px]"
					>
						<FileXIcon />
						{t("filter.missing")}
						<span className="text-[11px] tabular-nums opacity-70">
							{facets.missing}
						</span>
					</Toggle>
				)}

				{isFiltered(query) && (
					<Button
						variant="ghost"
						size="sm"
						onClick={clearQuery}
						className="h-8 phone:h-9 shrink-0 font-normal text-[13px] text-primary"
					>
						{t("filter.clearAll")}
					</Button>
				)}
			</div>

			<FilterSheet field={field} open={open} onClose={() => setOpen(false)} />
		</div>
	);
}

/** Which state of reading, or all of them. */
function StatusChoice({
	counted,
	className,
}: {
	counted: boolean;
	className?: string;
}) {
	const { t } = useTranslation();
	const status = useLibrary((state) => state.query.status);
	const setQuery = useLibrary((state) => state.setQuery);
	const facets = useFacets();
	const mark = useId();
	const current = status ?? ALL;

	const items = [
		{ value: ALL, label: t("filter.allStatuses"), count: facets.total },
		...STATUSES.map((value) => ({
			value,
			label: t(`status.${value}`),
			count: facets.statuses[value] ?? 0,
		})),
	];

	return (
		<ToggleGroup
			value={[current]}
			onValueChange={(value: string[]) => {
				const next = value[0];
				if (next)
					setQuery({ status: next === ALL ? undefined : (next as BookStatus) });
			}}
			aria-label={t("filter.status")}
			className={cn(
				CHOICE_GROUP,
				"shrink-0 rounded-[10px] bg-muted p-0.5",
				className,
			)}
		>
			{items.map((item) => (
				<ToggleGroupItem
					key={item.value}
					value={item.value}
					className={cn(
						"h-7 phone:h-8 gap-1.5 rounded-lg px-2.5 font-normal text-[13px]",
						CHOICE_ITEM,
					)}
				>
					{item.value === current && <ChoiceMark id={mark} />}
					{item.label}
					{counted && (
						<span className="text-[11px] text-muted-foreground tabular-nums">
							{item.count}
						</span>
					)}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}

/**
 * One list. Asked for, it says how many values it holds and carries its own
 * way off. A narrow strip scrolls, so what is on
 * comes first there.
 */
function ListButton({
	field,
	values,
	open,
	onOpen,
	onClear,
}: {
	field: ListField;
	values: string[];
	open: boolean;
	onOpen: () => void;
	onClear: () => void;
}) {
	const { t } = useTranslation();
	const name = t(`filter.fields.${field}`);
	const on = values.length > 0;

	return (
		<div
			className={cn(
				"flex h-8 phone:h-9 max-w-64 shrink-0 items-center rounded-lg border text-[13px]",
				on
					? "@max-3xl:-order-1 border-accent-foreground/25 bg-accent text-accent-foreground"
					: "border-border bg-card hover:bg-muted",
			)}
		>
			<button
				type="button"
				aria-haspopup="dialog"
				aria-expanded={open}
				onClick={onOpen}
				className="flex h-full min-w-0 items-center gap-1.5 rounded-lg px-2.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				<span className="truncate">{name}</span>
				{on && (
					<span
						aria-label={t("filter.chosenCount", { count: values.length })}
						className="flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-primary px-1 font-medium text-[11px] text-primary-foreground tabular-nums"
					>
						{values.length}
					</span>
				)}
			</button>
			{on && (
				<button
					type="button"
					aria-label={t("filter.clearField", { field: name })}
					onClick={onClear}
					className="mr-1 flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-accent-foreground/10"
				>
					<XIcon className="size-3.5" />
				</button>
			)}
		</div>
	);
}
