// Books looked up in Google Books, and what of it to write.

import { Button } from "@registrum/ui/components/button";
import { Checkbox } from "@registrum/ui/components/checkbox";
import { Label } from "@registrum/ui/components/label";
import { Spinner } from "@registrum/ui/components/spinner";
import { Switch } from "@registrum/ui/components/switch";
import { cn } from "@registrum/ui/lib/utils";
import { ExternalLinkIcon } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { AdaptiveDialog } from "@/components/adaptive-dialog";
import { SheetBarButton } from "@/components/phone-sheet";
import { useResetOnOpen } from "@/features/shelf/hooks/use-reset-on-open";
import { type Edit, useUpdateBooks } from "@/features/shelf/mutations";
import type { BookRecord } from "@/features/shelf/types";
import {
	changesOf,
	DEFAULT_CHOICE,
	type FieldChange,
	LOOKUP_FIELDS,
	type LookupChoice,
	type LookupField,
	patchOf,
} from "../lookup";
import { type LookupState, useLookupRun } from "../use-lookup-run";
import { UsageLine } from "./generation-parts";

const FIELD_LABELS = {
	title: "field.title",
	subtitle: "edit.subtitle",
	authors: "field.author",
	publisher: "field.publisher",
	published: "field.published",
	description: "record.description",
	identifiers: "record.identifier",
	language: "record.language",
} as const satisfies Record<LookupField, string>;

export function LookupDialog({
	open,
	onOpenChange,
	shelfId,
	books,
	onDone,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	shelfId: string;
	books: BookRecord[];
	/** Called once the writes have landed. */
	onDone?: () => void;
}) {
	const { t } = useTranslation();
	const update = useUpdateBooks();
	const run = useLookupRun(shelfId, books, open);
	const [choice, setChoice] = useResetOnOpen(open, () => DEFAULT_CHOICE);
	const [skipped, setSkipped] = useResetOnOpen(open, () => new Set<string>());
	const onlyEmptyId = useId();

	const edits: Edit[] = books.flatMap((book) => {
		const state = run.states[book.id];
		if (state?.status !== "done" || !state.lookup.found) return [];
		if (skipped.has(book.id)) return [];
		const patch = patchOf(book, state.lookup.found, choice);
		return Object.keys(patch).length ? [{ ids: [book.id], patch }] : [];
	});

	const answered = books.filter(
		(book) => run.states[book.id]?.status === "done",
	).length;
	const unfinished = !run.running && answered < books.length;

	const close = (next: boolean) => {
		if (!next) run.stop();
		onOpenChange(next);
	};

	const apply = () => {
		if (!edits.length) return;
		update.mutate(edits, {
			onSuccess: () => {
				onOpenChange(false);
				onDone?.();
			},
		});
	};
	const canApply = edits.length > 0 && !run.running && !update.isPending;

	return (
		<AdaptiveDialog
			open={open}
			onOpenChange={close}
			title={t("lookup.title", { count: books.length })}
			description={t("lookup.description")}
			className="flex max-h-[calc(100svh-2rem)] flex-col sm:max-w-[640px]"
			leading={
				<SheetBarButton
					disabled={update.isPending}
					onClick={() => close(false)}
				>
					{t("common.cancel")}
				</SheetBarButton>
			}
			trailing={
				<SheetBarButton strong disabled={!canApply} onClick={apply}>
					{t("common.apply")}
				</SheetBarButton>
			}
			footer={
				<>
					<Button
						variant="outline"
						disabled={update.isPending}
						onClick={() => close(false)}
					>
						{t("common.cancel")}
					</Button>
					<Button disabled={!canApply} onClick={apply}>
						{t("lookup.apply", { count: edits.length })}
					</Button>
				</>
			}
		>
			<div className="flex flex-col gap-3">
				<p className="text-muted-foreground text-xs">{t("lookup.fields")}</p>
				<div className="flex flex-wrap gap-x-4 gap-y-2">
					{LOOKUP_FIELDS.map((field) => (
						<Label key={field} className="cursor-pointer font-normal text-sm">
							<Checkbox
								checked={choice.fields[field]}
								onCheckedChange={(checked) =>
									setChoice((current) => ({
										...current,
										fields: { ...current.fields, [field]: checked === true },
									}))
								}
							/>
							{t(FIELD_LABELS[field])}
						</Label>
					))}
				</div>
				<div className="flex items-center gap-2">
					<Switch
						id={onlyEmptyId}
						checked={choice.onlyEmpty}
						onCheckedChange={(onlyEmpty) =>
							setChoice((current) => ({ ...current, onlyEmpty }))
						}
					/>
					<Label htmlFor={onlyEmptyId} className="font-normal text-sm">
						{t("lookup.onlyEmpty")}
					</Label>
				</div>
			</div>

			<div className="flex items-center gap-3 text-muted-foreground text-sm tabular-nums">
				{run.running && <Spinner className="size-4" />}
				<span>
					{t("lookup.progress", { done: answered, total: books.length })}
				</span>
				<div className="ml-auto">
					{run.running ? (
						<Button variant="ghost" size="sm" onClick={run.stop}>
							{t("common.stop")}
						</Button>
					) : (
						unfinished && (
							<Button variant="ghost" size="sm" onClick={run.resume}>
								{t("lookup.continue")}
							</Button>
						)
					)}
				</div>
			</div>

			<ul className="desktop:-mx-6 flex desktop:min-h-0 desktop:flex-1 flex-col gap-3 desktop:overflow-y-auto desktop:px-6 desktop:py-1">
				{books.map((book) => (
					<BookRow
						key={book.id}
						book={book}
						state={run.states[book.id]}
						choice={choice}
						single={books.length === 1}
						included={!skipped.has(book.id)}
						onIncludedChange={(included) =>
							setSkipped((current) => {
								const next = new Set(current);
								if (included) next.delete(book.id);
								else next.add(book.id);
								return next;
							})
						}
					/>
				))}
			</ul>
		</AdaptiveDialog>
	);
}

function BookRow({
	book,
	state,
	choice,
	single,
	included,
	onIncludedChange,
}: {
	book: BookRecord;
	state: LookupState | undefined;
	choice: LookupChoice;
	/** One book alone needs no box to leave it out. */
	single: boolean;
	included: boolean;
	onIncludedChange: (included: boolean) => void;
}) {
	const { t } = useTranslation();
	const found = state?.status === "done" ? state.lookup.found : null;
	const changes = found ? changesOf(book, found, choice) : [];

	return (
		<li className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3">
			<div className="flex items-center gap-2">
				{!single && found && (
					<Checkbox
						checked={included}
						onCheckedChange={(checked) => onIncludedChange(checked === true)}
						aria-label={t("lookup.include", { title: book.title })}
					/>
				)}
				<span className="min-w-0 flex-1 truncate font-medium text-sm">
					{book.title}
				</span>
				<Status state={state} />
			</div>

			{state?.status === "failed" && (
				<p className="text-destructive text-xs leading-relaxed">
					{state.message}
				</p>
			)}

			{state?.status === "done" && !found && (
				<p className="text-muted-foreground text-xs leading-relaxed">
					{state.lookup.reason}
				</p>
			)}

			{found && (
				<div
					inert={!single && !included}
					className={cn(
						"flex flex-col gap-2",
						!single && !included && "opacity-40",
					)}
				>
					{changes.length ? (
						<dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
							{changes.map((change) => (
								<ChangeRow key={change.field} change={change} />
							))}
						</dl>
					) : (
						<p className="text-muted-foreground text-xs">
							{t("lookup.noChanges")}
						</p>
					)}
				</div>
			)}

			{state?.status === "done" && (
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
					{found?.link && (
						<a
							href={found.link}
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
						>
							{t("lookup.open")}
							<ExternalLinkIcon className="size-3" />
						</a>
					)}
					<UsageLine usage={state.usage} />
				</div>
			)}
		</li>
	);
}

function Status({ state }: { state: LookupState | undefined }) {
	const { t } = useTranslation();
	const label = (() => {
		switch (state?.status) {
			case "running":
				return t("lookup.searching");
			case "done":
				return state.lookup.found ? t("lookup.found") : t("lookup.notFound");
			case "failed":
				return t("lookup.failed");
			default:
				return t("lookup.waiting");
		}
	})();
	return (
		<span
			className={cn(
				"flex shrink-0 items-center gap-1.5 text-xs",
				state?.status === "failed"
					? "text-destructive"
					: state?.status === "done" && state.lookup.found
						? "text-primary"
						: "text-muted-foreground",
			)}
		>
			{state?.status === "running" && <Spinner className="size-3" />}
			{label}
		</span>
	);
}

function ChangeRow({ change }: { change: FieldChange }) {
	const { t } = useTranslation();
	return (
		<>
			<dt
				className={cn(
					"text-xs leading-6",
					change.written ? "text-foreground" : "text-muted-foreground",
				)}
			>
				{t(FIELD_LABELS[change.field])}
			</dt>
			<dd
				className={cn(
					"flex min-w-0 flex-col gap-0.5",
					!change.written && "opacity-50",
				)}
			>
				{change.now && (
					<span
						className={cn(
							"line-clamp-2 text-muted-foreground text-xs",
							change.written && "line-through",
						)}
					>
						{change.now}
					</span>
				)}
				<span className="line-clamp-3 whitespace-pre-wrap">{change.found}</span>
			</dd>
		</>
	);
}
