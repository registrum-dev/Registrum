// Every name of one kind, as a sheet over the shelf: added, renamed and removed by hand.

import { Button } from "@registrum/ui/components/button";
import { Input } from "@registrum/ui/components/input";
import { Spinner } from "@registrum/ui/components/spinner";
import { useNavigate } from "@tanstack/react-router";
import {
	CheckIcon,
	PencilIcon,
	PlusIcon,
	SearchIcon,
	TagsIcon,
	Trash2Icon,
	XIcon,
} from "lucide-react";
import { memo, useCallback, useDeferredValue, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChoiceGroup } from "@/components/choice-group";
import { Confirm } from "@/components/confirm";
import {
	SheetBar,
	SheetBarButton,
	SheetBody,
	SheetSurface,
} from "@/components/phone-sheet";
import { ScreenEmpty } from "@/components/screen-empty";
import { ShowMore, useShownCount } from "@/components/show-more";
import { SheetLoading } from "@/features/shelf/components/sheet-parts";
import type { FacetEntry } from "@/features/shelf/filter";
import { useRetainedValue } from "@/features/shelf/hooks/use-retained-value";
import { nameKindLabel } from "@/features/shelf/labels";
import {
	useAddFacet,
	useRemoveFacet,
	useRemoveUnused,
	useRenameFacet,
} from "@/features/shelf/mutations";
import { useNames } from "@/features/shelf/queries";
import { useShelfStore } from "@/features/shelf/store";
import { FACET_KINDS, type FacetKind } from "@/features/shelf/types";
import { useEnterToSend } from "@/hooks/use-enter-to-send";
import { useWindowTitle } from "@/hooks/use-window-title";
import { foldText } from "@/lib/fold";
import { showNotice } from "@/store/alert";

const NO_ENTRIES: FacetEntry[] = [];

/** How many rows are drawn at a time; a shelf can hold thousands of names. */
const ROWS_STEP = 100;

/** The list, risen over the shelf like the settings. The router owns its coming and going. */
export function NamesSheet({
	open,
	kind,
	appear,
}: {
	open: boolean;
	kind: FacetKind | undefined;
	appear: boolean;
}) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const toShelf = useCallback(() => void navigate({ to: "/" }), [navigate]);
	const shown = useRetainedValue(open, kind ?? "author");

	return (
		<SheetSurface
			open={open}
			kind="page"
			label={t("names.title")}
			modal={false}
			appear={appear}
			onClose={toShelf}
			className="max-w-3xl"
		>
			<SheetBar
				title={t("names.title")}
				trailing={
					<SheetBarButton strong onClick={toShelf}>
						{t("common.done")}
					</SheetBarButton>
				}
			/>
			<NameList kind={shown} />
		</SheetSurface>
	);
}

/** The kind to show, the field that finds and adds, and the names. */
function NameList({ kind }: { kind: FacetKind }) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const shelfId = useShelfStore((state) => state.shelfId);
	const hydrated = useShelfStore((state) => state.hydrated);
	const names = useNames(kind);
	const entries = names.data ?? NO_ENTRIES;
	const add = useAddFacet();
	const sweep = useRemoveUnused();
	const [typed, setTyped] = useState("");
	const [sweeping, setSweeping] = useState(false);

	useWindowTitle(`${t("names.title")} — ${t("app.name")}`);

	const wanted = typed.trim();
	const held = entries.some((entry) => entry.name === wanted);
	// The list catches up with the typing, rather than holding each key back.
	const sought = useDeferredValue(wanted);
	const folded = useMemo(
		() => entries.map((entry) => foldText(entry.name)),
		[entries],
	);
	const shown = useMemo(() => {
		if (!sought) return entries;
		const text = foldText(sought);
		return entries.filter((_, at) => folded[at]?.includes(text));
	}, [entries, folded, sought]);
	const [limit, more] = useShownCount(ROWS_STEP, `${kind}:${sought}`);

	const submit = () => {
		if (wanted === "" || held || add.isPending) return;
		add.mutate(
			{ kind, name: wanted },
			{
				onSuccess: (name) => {
					setTyped("");
					showNotice(t("names.added", { name }));
				},
			},
		);
	};
	const enter = useEnterToSend(submit);

	const unused = entries.filter((entry) => entry.count === 0).length;
	const removeUnused = () => {
		setSweeping(false);
		sweep.mutate(kind, {
			onSuccess: (removed) =>
				showNotice(t("names.unusedRemoved", { count: removed.length })),
		});
	};

	const pick = (next: FacetKind) =>
		void navigate({ to: "/names", search: { kind: next }, replace: true });

	if (!hydrated || !shelfId) return <SheetLoading />;

	return (
		<>
			<div className="flex shrink-0 flex-col gap-3 border-border border-b desktop:px-6 px-4 py-3">
				<ChoiceGroup
					value={kind}
					onChange={pick}
					aria-label={t("names.kind")}
					className="w-full overflow-x-auto rounded-xl border border-border bg-card p-1"
					itemClassName="h-9 min-w-fit flex-1 px-2.5 font-normal"
					choices={FACET_KINDS.map((each) => ({
						value: each,
						content: nameKindLabel(each),
					}))}
				/>
				<div className="flex items-center gap-2">
					<div className="relative min-w-0 flex-1">
						<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={typed}
							onChange={(event) => setTyped(event.target.value)}
							{...enter}
							placeholder={t("names.search")}
							aria-label={t("names.search")}
							className="h-10 pl-9"
						/>
					</div>
					<Button
						onClick={submit}
						disabled={wanted === "" || held || add.isPending}
						className="h-10 shrink-0 gap-2 rounded-xl px-4"
					>
						<PlusIcon />
						{t("names.add")}
					</Button>
				</div>
				{unused > 0 && !names.isPlaceholderData && (
					<div className="flex items-center gap-2">
						<span className="min-w-0 flex-1 truncate text-muted-foreground text-xs">
							{t("names.unusedCount", { count: unused })}
						</span>
						<Button
							variant="ghost"
							size="sm"
							disabled={sweep.isPending}
							onClick={() => setSweeping(true)}
							className="shrink-0 gap-2 rounded-lg text-muted-foreground hover:text-destructive"
						>
							<Trash2Icon />
							{t("names.removeUnusedAll")}
						</Button>
					</div>
				)}
			</div>

			<Confirm
				open={sweeping}
				onOpenChange={setSweeping}
				title={t("names.removeUnusedTitle", {
					kind: nameKindLabel(kind),
					count: unused,
				})}
				description={t("names.removeUnusedDescription")}
				confirmLabel={t("common.delete")}
				onConfirm={removeUnused}
			/>

			<SheetBody className="p-0">
				{names.isPending ? (
					<div className="flex min-h-40 items-center justify-center">
						<Spinner aria-label={t("common.loading")} />
					</div>
				) : shown.length === 0 ? (
					<ScreenEmpty
						className="h-auto"
						icon={<TagsIcon />}
						title={wanted ? t("names.noMatch") : t("names.empty")}
						description={
							wanted
								? t("names.noMatchHint", { name: wanted })
								: t("names.emptyHint")
						}
					/>
				) : (
					<div className="flex flex-col pb-3">
						<ul className="divide-y divide-border">
							{shown.slice(0, limit).map((entry) => (
								<NameRow
									key={`${kind}:${entry.name}`}
									kind={kind}
									entry={entry}
									entries={entries}
								/>
							))}
						</ul>
						{shown.length > limit && (
							<ShowMore
								count={Math.min(shown.length - limit, ROWS_STEP)}
								onClick={more}
								className="mt-3"
							/>
						)}
					</div>
				)}
			</SheetBody>
		</>
	);
}

/** One name: how many books carry it, and the two things that can be done to it. */
const NameRow = memo(function NameRow({
	kind,
	entry,
	entries,
}: {
	kind: FacetKind;
	entry: FacetEntry;
	/** Every name of this kind: typing another one's name is a merge. */
	entries: FacetEntry[];
}) {
	const { t } = useTranslation();
	const rename = useRenameFacet();
	const remove = useRemoveFacet();
	const { name, count } = entry;

	const [draft, setDraft] = useState<string | null>(null);
	const [merging, setMerging] = useState(false);
	const [removing, setRemoving] = useState(false);

	const wanted = draft?.trim() ?? "";
	const changed = wanted !== "" && wanted !== name;
	const joins = changed && entries.some((other) => other.name === wanted);

	const write = () => {
		rename.mutate(
			{ kind, from: name, to: wanted },
			{
				onSuccess: (renamed) => {
					setMerging(false);
					setDraft(null);
					if (renamed.merged) {
						showNotice(t("facet.merged", { from: name, to: renamed.name }));
					}
				},
			},
		);
	};

	/** Two names becoming one cannot be undone by typing the old one back. */
	const submit = () => {
		if (!changed) return setDraft(null);
		if (rename.isPending) return;
		if (joins) setMerging(true);
		else write();
	};
	const enter = useEnterToSend(submit);

	const drop = () => {
		setRemoving(false);
		remove.mutate(
			{ kind, name },
			{ onSuccess: () => showNotice(t("names.removed", { name })) },
		);
	};

	return (
		<li className="flex min-h-13 items-center gap-2 desktop:px-6 px-4 py-1.5">
			{draft === null ? (
				<>
					<span className="min-w-0 flex-1 truncate text-sm">{name}</span>
					<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
						{count > 0 ? t("common.bookCount", { count }) : t("names.unused")}
					</span>
					<Button
						variant="ghost"
						size="icon"
						aria-label={t("names.rename", { name })}
						onClick={() => setDraft(name)}
						className="shrink-0 rounded-xl text-muted-foreground"
					>
						<PencilIcon />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						aria-label={t("names.remove", { name })}
						disabled={remove.isPending}
						onClick={() => setRemoving(true)}
						className="shrink-0 rounded-xl text-muted-foreground hover:text-destructive"
					>
						<Trash2Icon />
					</Button>
				</>
			) : (
				<>
					<Input
						autoFocus
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						{...enter}
						onKeyDown={(event) => {
							if (event.key === "Escape") {
								event.preventDefault();
								setDraft(null);
							} else enter.onKeyDown(event);
						}}
						aria-label={t("names.rename", { name })}
						className="h-9 min-w-0 flex-1"
					/>
					<Button
						variant="ghost"
						size="icon"
						aria-label={t("common.save")}
						disabled={rename.isPending}
						onClick={submit}
						className="shrink-0 rounded-xl"
					>
						<CheckIcon />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						aria-label={t("common.cancel")}
						onClick={() => setDraft(null)}
						className="shrink-0 rounded-xl text-muted-foreground"
					>
						<XIcon />
					</Button>
				</>
			)}

			<Confirm
				open={merging}
				onOpenChange={setMerging}
				title={t("facet.mergeTitle", { from: name, to: wanted })}
				description={t("facet.mergeDescription", {
					from: name,
					to: wanted,
					count,
				})}
				confirmLabel={t("facet.merge")}
				onConfirm={write}
			/>
			<Confirm
				open={removing}
				onOpenChange={setRemoving}
				title={t("names.removeTitle", { name })}
				description={
					count > 0
						? t("names.removeDescription", { count })
						: t("names.removeUnused")
				}
				confirmLabel={t("common.delete")}
				onConfirm={drop}
			/>
		</li>
	);
});
