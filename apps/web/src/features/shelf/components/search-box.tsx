// The words the shelf is searched for.

import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@registrum/ui/components/input-group";
import { cn } from "@registrum/ui/lib/utils";
import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { nameMatches } from "@/features/shelf/filter-options";
import { useActiveOption } from "@/features/shelf/hooks/use-active-option";
import { nameKindLabel } from "@/features/shelf/labels";
import { useFacets } from "@/features/shelf/queries";
import type { FacetKind } from "@/features/shelf/types";

/** How many of the shelf's names the box offers at once. */
const NAMES_OFFERED = 7;

/**
 * The words the shelf is searched for: typed into a copy, handed over later.
 * While it is being typed, the shelf's names that hold it are offered
 * underneath, and choosing one asks for that name instead.
 */
export function SearchBox({
	value,
	onChange,
	onPickName,
	className,
}: {
	value: string;
	onChange: (value: string) => void;
	onPickName: (kind: FacetKind, name: string) => void;
	className?: string;
}) {
	const { t } = useTranslation();
	const facets = useFacets();
	const [draft, setDraft] = useState(value);
	const [focused, setFocused] = useState(false);
	const input = useRef<HTMLInputElement>(null);
	const ids = useId();

	// Words set from outside -- a name picked, every condition cleared -- replace
	// the copy being typed.
	const [seen, setSeen] = useState(value);
	if (value !== seen) {
		setSeen(value);
		setDraft(value);
	}

	const write = useEffectEvent((text: string) => onChange(text));
	useEffect(() => {
		if (draft === value) return;
		const timer = setTimeout(() => write(draft), 300);
		return () => clearTimeout(timer);
	}, [draft, value]);

	// `/` reaches the box from anywhere on the shelf. Both bars carry one, and
	// only the one on screen answers.
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey)
				return;
			const at = document.activeElement;
			if (
				at instanceof HTMLElement &&
				(at.isContentEditable ||
					/^(INPUT|TEXTAREA|SELECT)$/.test(at.tagName) ||
					at.closest("[role=dialog]"))
			)
				return;
			if (!input.current || input.current.offsetParent === null) return;
			event.preventDefault();
			input.current.focus();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const typed = draft.trim();
	const names =
		focused && typed ? nameMatches(facets, typed, NAMES_OFFERED) : [];
	const open = focused && typed !== "";

	/** The first row keeps the words as words; the rest turn them into a name. */
	const choose = (index: number) => {
		const picked = names[index - 1];
		if (picked) {
			setDraft("");
			onPickName(picked.kind, picked.name);
		} else {
			onChange(draft);
		}
		input.current?.blur();
	};

	const rows = useActiveOption(names.length + 1, choose);
	const rowId = (index: number) => `${ids}-${index}`;

	const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (!open) return;
		if (event.key === "Escape") input.current?.blur();
		else rows.onKeyDown(event);
	};

	return (
		<div className={cn("relative", className)}>
			<InputGroup className="h-full rounded-[inherit]">
				<InputGroupAddon>
					<SearchIcon className="text-muted-foreground" />
				</InputGroupAddon>
				<InputGroupInput
					ref={input}
					value={draft}
					onChange={(event) => {
						setDraft(event.target.value);
						rows.restart();
					}}
					onFocus={() => setFocused(true)}
					onBlur={() => setFocused(false)}
					onKeyDown={onKeyDown}
					placeholder={t("shelf.searchPlaceholder")}
					aria-label={t("shelf.searchLabel")}
					aria-expanded={open}
					aria-autocomplete="list"
					aria-activedescendant={open ? rowId(rows.active) : undefined}
					autoComplete="off"
				/>
				{draft && (
					<InputGroupAddon align="inline-end">
						<InputGroupButton
							size="icon-xs"
							aria-label={t("shelf.clearSearch")}
							onClick={() => setDraft("")}
						>
							<XIcon />
						</InputGroupButton>
					</InputGroupAddon>
				)}
			</InputGroup>

			{open && (
				<div
					role="listbox"
					aria-label={t("shelf.searchLabel")}
					// Keeps the box focused through the click, so the choice lands first.
					onPointerDown={(event) => event.preventDefault()}
					className="absolute top-[calc(100%+0.375rem)] left-0 z-30 flex @3xl:w-96 w-full min-w-72 flex-col rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
				>
					<SuggestRow
						id={rowId(0)}
						active={rows.active === 0}
						onClick={() => choose(0)}
					>
						<SearchIcon className="size-4 shrink-0 text-muted-foreground" />
						<span className="min-w-0 flex-1 truncate">
							{t("filter.searchEverywhere", { text: typed })}
						</span>
					</SuggestRow>
					{names.map((entry, index) => (
						<SuggestRow
							key={`${entry.kind}:${entry.name}`}
							id={rowId(index + 1)}
							active={rows.active === index + 1}
							onClick={() => choose(index + 1)}
						>
							<span className="shrink-0 rounded-md border border-border px-1.5 text-[11px] text-muted-foreground">
								{nameKindLabel(entry.kind)}
							</span>
							<span className="min-w-0 flex-1 truncate">{entry.name}</span>
							<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
								{entry.count}
							</span>
						</SuggestRow>
					))}
					{names.length > 0 && (
						<p className="px-2 pt-1.5 pb-0.5 text-[11px] text-muted-foreground">
							{t("filter.suggestHint")}
						</p>
					)}
				</div>
			)}
		</div>
	);
}

function SuggestRow({
	id,
	active,
	onClick,
	children,
}: {
	id: string;
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<div
			id={id}
			role="option"
			aria-selected={active}
			onClick={onClick}
			className={cn(
				"flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm",
				active && "bg-muted",
			)}
		>
			{children}
		</div>
	);
}
