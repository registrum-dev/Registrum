// One of the filter's lists, risen from the bottom.

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@registrum/ui/components/collapsible";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@registrum/ui/components/input-group";
import { cn } from "@registrum/ui/lib/utils";
import {
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	SearchIcon,
} from "lucide-react";
import {
	memo,
	useCallback,
	useDeferredValue,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
	PhoneSheet,
	SheetBar,
	SheetBarButton,
	SheetBody,
} from "@/components/phone-sheet";
import { ShowMore, useShownCount } from "@/components/show-more";
import {
	type FilterField,
	listPatch,
	listValues,
	NONE,
} from "@/features/shelf/filter";
import {
	type FilterOption,
	filterOptions,
	foldOption,
	isNameField,
	optionMatches,
	sortByName,
} from "@/features/shelf/filter-options";
import { useActiveOption } from "@/features/shelf/hooks/use-active-option";
import { useFacets, useFilterOptions } from "@/features/shelf/queries";
import { useShelfStore } from "@/features/shelf/store";
import { useFormFactor } from "@/hooks/use-form-factor";
import { foldText } from "@/lib/fold";
import { clothColor } from "./book-cover";

/** The sheet one list is chosen from. It keeps the last list through its way out. */
export function FilterSheet({
	field,
	open,
	onClose,
}: {
	field: FilterField | null;
	open: boolean;
	onClose: () => void;
}) {
	const { t } = useTranslation();
	const filter = useShelfStore((state) => state.filter);
	const setFilter = useShelfStore((state) => state.setFilter);
	const chosen = useMemo(
		() => (field ? listValues(filter, field) : []),
		[filter, field],
	);
	const title = field ? t(`filter.fields.${field}`) : t("filter.title");

	return (
		<PhoneSheet
			open={open}
			onOpenChange={(next) => {
				if (!next) onClose();
			}}
			kind="half"
			label={title}
		>
			<SheetBar
				leading={
					<SheetBarButton
						disabled={chosen.length === 0}
						onClick={() => field && setFilter(listPatch(field, []))}
					>
						{t("filter.unset")}
					</SheetBarButton>
				}
				title={title}
				onClose={onClose}
			/>
			{field && <FilterChoices key={field} field={field} chosen={chosen} />}
		</PhoneSheet>
	);
}

/** How many values a list draws at a time; a shelf can hold thousands of names. */
const OPTIONS_STEP = 200;

function FilterChoices({
	field,
	chosen,
}: {
	field: FilterField;
	chosen: string[];
}) {
	const { t, i18n } = useTranslation();
	const facets = useFacets();
	const setFilter = useShelfStore((state) => state.setFilter);
	const reach = useFilterOptions(field).data;
	const layout = useFormFactor();

	const [typed, setTyped] = useState("");
	const [showUnreached, setShowUnreached] = useState(false);
	const input = useRef<HTMLInputElement>(null);
	const body = useRef<HTMLDivElement>(null);
	const ids = useId();

	const named = isNameField(field);
	const chips = field === "tag";

	const options = useMemo(() => filterOptions(facets, field), [facets, field]);
	const pressed = useMemo(() => new Set(chosen), [chosen]);
	// The list catches up with the typing, rather than holding each key back.
	const sought = foldText(useDeferredValue(typed).trim());

	const toggle = useCallback(
		(value: string) => {
			setFilter(
				listPatch(
					field,
					chosen.includes(value)
						? chosen.filter((kept) => kept !== value)
						: [...chosen, value],
				),
			);
		},
		[field, chosen, setFilter],
	);

	const reached = useCallback(
		(option: FilterOption) => !reach || reach.has(option.value),
		[reach],
	);

	// Sorted once for what the shelf holds, not again at each key.
	const sorted = useMemo(
		() =>
			named ? sortByName(options.map(foldOption), i18n.language) : undefined,
		[named, options, i18n.language],
	);

	const groups = useMemo(() => {
		if (!sorted) return [{ id: "all", options, dim: false }];
		// A value asked for stays in the list even once no book carries it, or it
		// could not be taken off.
		const known = new Set(options.map((option) => option.value));
		const gone = chosen
			.filter((value) => !known.has(value))
			.map((value) =>
				foldOption({ value, label: value, count: 0, note: null }),
			);
		const all = (
			gone.length ? sortByName([...sorted, ...gone], i18n.language) : sorted
		)
			.filter((entry) => optionMatches(entry, sought))
			.map((entry) => entry.option);
		const kept = (option: FilterOption) =>
			reached(option) || pressed.has(option.value);
		return [
			{ id: "all", options: all.filter(kept), dim: false },
			{
				id: "unreached",
				options: all.filter((option) => !kept(option)),
				dim: true,
			},
		];
	}, [sorted, options, chosen, pressed, reached, sought, i18n.language]);

	const [limit, more] = useShownCount(OPTIONS_STEP, sought);
	const [unreachedLimit, moreUnreached] = useShownCount(OPTIONS_STEP, sought);
	const drawn = (group: (typeof groups)[number]) =>
		group.options.slice(0, group.id === "unreached" ? unreachedLimit : limit);

	const unreached = groups.find((group) => group.id === "unreached");
	const shown = groups.flatMap((group) =>
		group.id === "unreached" && !showUnreached ? [] : drawn(group),
	);
	const optionId = (value: string) => `${ids}-${encodeURIComponent(value)}`;

	// The sheet takes focus as it rises; the search box asks for it after.
	useEffect(() => {
		if (!named || layout === "phone") return;
		const frame = requestAnimationFrame(() =>
			input.current?.focus({ preventScroll: true }),
		);
		return () => cancelAnimationFrame(frame);
	}, [named, layout]);

	/** Keeps the row the keys are on in sight, without moving the sheet itself. */
	const reveal = (index: number) => {
		const value = shown[index]?.value;
		const box = body.current;
		const row =
			value !== undefined ? document.getElementById(optionId(value)) : null;
		if (!box || !row) return;
		const top = row.offsetTop - box.offsetTop;
		if (top < box.scrollTop + 32) box.scrollTop = top - 32;
		else if (top + row.offsetHeight > box.scrollTop + box.clientHeight)
			box.scrollTop = top + row.offsetHeight - box.clientHeight;
	};

	const rows = useActiveOption(
		shown.length,
		(index) => {
			const value = shown[index]?.value;
			if (value !== undefined) toggle(value);
		},
		reveal,
	);
	const activeValue = shown[rows.active]?.value;

	const renderOptions = (group: (typeof groups)[number]) => {
		const list = drawn(group);
		const rest = group.options.length - list.length;
		return (
			<>
				{chips ? (
					<div className="flex flex-wrap gap-1.5 px-1 pt-0.5 pb-1">
						{list.map((option) => (
							<ChoiceChip
								key={option.value}
								id={optionId(option.value)}
								option={option}
								pressed={pressed.has(option.value)}
								active={option.value === activeValue}
								dim={group.dim}
								onToggle={toggle}
							/>
						))}
					</div>
				) : (
					list.map((option) => (
						<ChoiceRow
							key={option.value}
							id={optionId(option.value)}
							option={option}
							swatch={named && option.value !== NONE}
							pressed={pressed.has(option.value)}
							active={named && option.value === activeValue}
							dim={
								group.dim ||
								(!named && !reached(option) && !pressed.has(option.value))
							}
							onToggle={toggle}
						/>
					))
				)}
				{rest > 0 && (
					<div className="flex justify-center py-1">
						<ShowMore
							count={Math.min(rest, OPTIONS_STEP)}
							onClick={group.id === "unreached" ? moreUnreached : more}
						/>
					</div>
				)}
			</>
		);
	};

	return (
		<>
			{named && (
				<div className="flex shrink-0 flex-col gap-2 px-3 pt-2.5 pb-2">
					<InputGroup className="h-10 rounded-xl">
						<InputGroupAddon>
							<SearchIcon className="text-muted-foreground" />
						</InputGroupAddon>
						<InputGroupInput
							ref={input}
							value={typed}
							onChange={(event) => {
								setTyped(event.target.value);
								rows.restart();
							}}
							onKeyDown={rows.onKeyDown}
							placeholder={t("filter.searchAmong", { count: options.length })}
							aria-label={t("filter.search", {
								field: t(`filter.fields.${field}`),
							})}
							aria-activedescendant={
								activeValue !== undefined ? optionId(activeValue) : undefined
							}
							autoComplete="off"
						/>
					</InputGroup>
					<div className="flex items-center px-1">
						<span className="truncate text-muted-foreground text-xs">
							{t("filter.anyOf")}
						</span>
					</div>
				</div>
			)}

			<SheetBody
				ref={body}
				className={cn("px-2 pt-1", named && "border-border border-t")}
			>
				{named && shown.length === 0 && !unreached?.options.length ? (
					<p className="px-3 py-6 text-center text-muted-foreground text-sm">
						{typed.trim()
							? t("filter.notFound", { text: typed.trim() })
							: t("filter.nothingYet")}
					</p>
				) : (
					groups.map((group) =>
						group.options.length === 0 ? null : group.id === "unreached" ? (
							<Collapsible
								key={group.id}
								open={showUnreached}
								onOpenChange={setShowUnreached}
							>
								<CollapsibleTrigger className="flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-muted-foreground text-xs hover:text-foreground">
									{showUnreached ? (
										<ChevronDownIcon className="size-3.5" />
									) : (
										<ChevronRightIcon className="size-3.5" />
									)}
									{t("filter.unreached", { count: group.options.length })}
								</CollapsibleTrigger>
								<CollapsibleContent>{renderOptions(group)}</CollapsibleContent>
							</Collapsible>
						) : (
							<div key={group.id} className="pt-1">
								{renderOptions(group)}
							</div>
						),
					)
				)}
			</SheetBody>
		</>
	);
}

/** One value, as a row: a check, a colour, its name, and how many books carry it. */
const ChoiceRow = memo(function ChoiceRow({
	id,
	option,
	swatch,
	pressed,
	active,
	dim,
	onToggle,
}: {
	id: string;
	option: FilterOption;
	swatch: boolean;
	pressed: boolean;
	active: boolean;
	dim: boolean;
	onToggle: (value: string) => void;
}) {
	return (
		<button
			type="button"
			id={id}
			aria-pressed={pressed}
			data-active={active || undefined}
			onClick={() => onToggle(option.value)}
			className="flex min-h-10 phone:min-h-12 w-full items-center gap-3 rounded-lg px-2.5 py-1 text-start text-sm transition-colors hover:bg-muted data-active:bg-muted"
		>
			<span
				aria-hidden
				className={cn(
					"flex size-4 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-muted-foreground/60",
					pressed && "border-primary bg-primary text-primary-foreground",
				)}
			>
				{pressed && <CheckIcon className="size-3" strokeWidth={3} />}
			</span>
			{swatch && (
				<span
					aria-hidden
					className="h-5 w-1.5 shrink-0 rounded-[2px]"
					style={{ background: clothColor(option.value) }}
				/>
			)}
			<span className={cn("flex min-w-0 flex-1 flex-col", dim && "opacity-50")}>
				<span className="truncate">{option.label}</span>
				{option.note && (
					<span className="truncate text-muted-foreground text-xs">
						{option.note}
					</span>
				)}
			</span>
			<span
				className={cn(
					"shrink-0 text-muted-foreground text-xs tabular-nums",
					dim && "opacity-50",
				)}
			>
				{option.count}
			</span>
		</button>
	);
});

/** One tag, as a chip: there are as many as the reader made, and a hundred
 *  chips read at a glance where a hundred rows do not. */
const ChoiceChip = memo(function ChoiceChip({
	id,
	option,
	pressed,
	active,
	dim,
	onToggle,
}: {
	id: string;
	option: FilterOption;
	pressed: boolean;
	active: boolean;
	dim: boolean;
	onToggle: (value: string) => void;
}) {
	return (
		<button
			type="button"
			id={id}
			aria-pressed={pressed}
			onClick={() => onToggle(option.value)}
			className={cn(
				"inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[13px] transition-colors hover:bg-muted",
				pressed &&
					"border-primary bg-primary text-primary-foreground hover:bg-primary/85",
				active && "ring-2 ring-ring/60",
				dim && !pressed && "opacity-50",
			)}
		>
			{option.label}
			<span
				className={cn(
					"text-[11px] tabular-nums",
					pressed ? "opacity-80" : "text-muted-foreground",
				)}
			>
				{option.count}
			</span>
		</button>
	);
});
