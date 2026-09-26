// The right half of the path rule: what each book would get.

import { Button } from "@registrum/ui/components/button";
import { Tabs, TabsList, TabsTrigger } from "@registrum/ui/components/tabs";
import { cn } from "@registrum/ui/lib/utils";
import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAiConfigured } from "@/features/ai/queries";
import { categoryName } from "@/features/shelf/labels";
import { canAddExample, useRuleStore } from "../store";
import type {
	RuleBook,
	RuleChange,
	RuleOutcome,
	RulePreview,
	RuleValue,
} from "../types";

/** More than this in one list is left to the count under it. */
const SHOWN = 200;

const GROUP_TONES = [
	"bg-blue-500/15 text-blue-700 dark:text-blue-300",
	"bg-orange-500/15 text-orange-700 dark:text-orange-300",
	"bg-teal-500/15 text-teal-700 dark:text-teal-300",
	"bg-violet-500/15 text-violet-700 dark:text-violet-300",
	"bg-pink-500/15 text-pink-700 dark:text-pink-300",
	"bg-lime-500/15 text-lime-700 dark:text-lime-300",
] as const;

/** The colour a group is drawn in, the same in the pattern's values and in the paths. */
export function groupTone(at: number): string {
	return GROUP_TONES[at % GROUP_TONES.length] ?? GROUP_TONES[0];
}

const OUTCOME_TONES: Record<RuleOutcome, string> = {
	changed: "bg-accent text-accent-foreground",
	unchanged: "bg-muted text-muted-foreground",
	missed: "bg-orange-500/15 text-orange-800 dark:text-orange-300",
};

const DOTS: Record<RuleOutcome, string> = {
	changed: "bg-primary",
	missed: "bg-orange-600",
	unchanged: "bg-muted-foreground/60",
};

type Tab = RuleOutcome | "all";

const TABS: Tab[] = ["changed", "missed", "unchanged", "all"];

export function RulePreviewList({
	preview,
	empty,
	className,
}: {
	preview: RulePreview | undefined;
	/** What to say instead of a list, when there is nothing to ask yet. */
	empty: string | null;
	className?: string;
}) {
	const { t } = useTranslation();
	const [tab, setTab] = useState<Tab>("changed");

	const counts: Record<Tab, number> = {
		changed: preview?.changed ?? 0,
		missed: preview?.missed ?? 0,
		unchanged: preview?.unchanged ?? 0,
		all: preview?.books.length ?? 0,
	};
	const books = (preview?.books ?? []).filter(
		(book) => tab === "all" || book.outcome === tab,
	);

	return (
		<div className={cn("flex flex-col", className)}>
			<div className="sticky top-0 z-10 flex flex-col gap-3 bg-background desktop:px-7 px-4 desktop:pt-5 pt-4">
				<div className="flex flex-wrap items-baseline justify-between gap-x-3">
					<h3 className="font-semibold text-base">{t("rule.preview")}</h3>
					<span className="text-muted-foreground text-xs">
						{t("rule.previewNote")}
					</span>
				</div>
				<Tabs value={tab} onValueChange={(next: Tab) => setTab(next)}>
					<TabsList
						variant="line"
						className="flex h-auto! w-full justify-start gap-1 overflow-x-auto rounded-none p-0 shadow-[inset_0_-1px_0_var(--color-border)]"
					>
						{TABS.map((each) => (
							<TabsTrigger
								key={each}
								value={each}
								className="h-10! flex-none gap-2 rounded-none border-0 border-transparent border-b-2 px-3 font-normal text-muted-foreground text-sm after:hidden hover:text-foreground focus-visible:ring-0 data-active:border-primary data-active:font-semibold data-active:text-foreground"
							>
								{each !== "all" && (
									<span className={cn("size-2 rounded-full", DOTS[each])} />
								)}
								{each === "all" ? t("rule.all") : t(`ruleOutcome.${each}`)}
								<span className="text-muted-foreground tabular-nums">
									{counts[each]}
								</span>
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
			</div>

			<div className="flex flex-col gap-2.5 desktop:px-7 px-4 pt-4 pb-6">
				{empty !== null || !books.length ? (
					<p className="py-12 text-center text-muted-foreground text-sm">
						{empty ?? t("rule.noBooks")}
					</p>
				) : (
					<>
						{books.slice(0, SHOWN).map((book) => (
							<BookRow key={book.id} book={book} />
						))}
						{books.length > SHOWN && (
							<p className="py-3 text-center text-muted-foreground text-sm">
								{t("rule.more", { count: books.length - SHOWN })}
							</p>
						)}
					</>
				)}
			</div>
		</div>
	);
}

function BookRow({ book }: { book: RuleBook }) {
	const { t } = useTranslation();

	return (
		<article className="flex flex-col gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5">
			<div className="flex items-start gap-3">
				<span
					className={cn(
						"mt-0.5 w-20 shrink-0 rounded-full py-0.5 text-center font-medium text-xs",
						OUTCOME_TONES[book.outcome],
					)}
				>
					{t(`ruleOutcome.${book.outcome}`)}
				</span>
				<p className="min-w-0 flex-1 select-text break-all font-mono text-[13px] text-muted-foreground leading-relaxed">
					{book.path.map((piece, at) =>
						piece.group === null ? (
							<span key={at}>{piece.text}</span>
						) : (
							<span
								key={at}
								className={cn("rounded-sm px-px", groupTone(piece.group))}
							>
								{piece.text}
							</span>
						),
					)}
				</p>
				<UseAsExample path={book.path.map((piece) => piece.text).join("")} />
			</div>
			{book.changes.length > 0 && (
				<div className="grid desktop:grid-cols-[6rem_minmax(0,1fr)_1.25rem_minmax(0,1fr)] grid-cols-[5.5rem_minmax(0,1fr)] gap-x-2.5 gap-y-1.5 desktop:ps-23">
					{book.changes.map((change) => (
						<ChangeRow key={change.field} change={change} />
					))}
				</div>
			)}
		</article>
	);
}

/** Hands a book's path to the example list, while there is room in it. */
function UseAsExample({ path }: { path: string }) {
	const { t } = useTranslation();
	const configured = useAiConfigured();
	const room = useRuleStore((state) => canAddExample(state, path));
	const addExample = useRuleStore((state) => state.addExample);
	if (!configured || !room) return null;

	return (
		<Button
			variant="ghost"
			size="xs"
			onClick={() => addExample(path)}
			className="shrink-0"
		>
			{t("rule.useAsExample")}
		</Button>
	);
}

function ChangeRow({ change }: { change: RuleChange }) {
	const { t } = useTranslation();
	const before = (
		<span
			className={cn(
				"text-[13px] text-muted-foreground",
				change.overwrite && "line-through decoration-orange-600",
			)}
		>
			{valueText(change.before, t)}
		</span>
	);
	const after = change.skipped ? (
		<span className="text-destructive text-xs">
			{t(`rule.${change.skipped}`, { value: valueText(change.after, t) })}
		</span>
	) : (
		<span className="justify-self-start rounded bg-accent px-1.5 font-medium text-[13px] text-accent-foreground">
			{valueText(change.after, t)}
		</span>
	);

	return (
		<>
			<span className="text-muted-foreground text-xs leading-5">
				{t(`ruleField.${change.field}`)}
			</span>
			{/* On a phone the two sides stack under the field's name. */}
			<span className="flex desktop:contents min-w-0 flex-wrap items-baseline gap-x-1.5">
				{before}
				<span aria-hidden className="text-muted-foreground">
					→
				</span>
				{after}
			</span>
		</>
	);
}

function valueText(value: RuleValue, t: TFunction): string {
	switch (value.kind) {
		case "empty":
			return t("common.empty");
		case "text":
			return value.value || t("common.empty");
		case "list":
			return value.value.length
				? value.value.join(t("common.listSeparator"))
				: t("common.empty");
		case "number":
			return value.value === null ? t("common.empty") : String(value.value);
		case "category":
			return categoryName(value.value);
	}
}
