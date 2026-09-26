// The button and the line every generation shares.

import { Button } from "@Registrum/ui/components/button";
import { Spinner } from "@Registrum/ui/components/spinner";
import { cn } from "@Registrum/ui/lib/utils";
import { SparklesIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Presence } from "@/components/presence";
import type { Sent, Usage } from "../types";

/** Just enough of a generation to say that one is out, and for how long. */
interface Waiting {
	pending: boolean;
	sent: Sent | null;
	seconds: number;
}

/**
 * The order every generated section is laid out in. It knows nothing of what is
 * being generated — the caller hands it the note, the button, the answer and
 * the word for there being none.
 */
export function GeneratedBlock({
	note,
	button,
	generation,
	loading,
	empty,
	children,
}: {
	note: ReactNode;
	button: ReactNode;
	generation: Waiting;
	/** True while the library is still being asked what this book already holds. */
	loading: boolean;
	/** What to say when there is no answer to show. */
	empty: ReactNode;
	children?: ReactNode;
}) {
	const { t } = useTranslation();

	return (
		<>
			<div className="flex items-center gap-3">
				{note}
				<div className="ml-auto shrink-0">{button}</div>
			</div>

			{/* The waiting row and the answer are the same slot, so one leaves
          before the other arrives rather than both being there for a frame. */}
			<Presence>
				{generation.pending && (
					<Generating
						key="generating"
						sent={generation.sent}
						seconds={generation.seconds}
					/>
				)}
			</Presence>

			{/* Reading what is already written is a row out of the library's own
          database, so it is nearly always there before this draws. Only when
          it is not does the section say it is waiting. */}
			{loading && (
				<div className="flex justify-center py-6">
					<Spinner aria-label={t("common.loading")} />
				</div>
			)}

			{!loading && !generation.pending && (children || empty)}
		</>
	);
}

export function GenerateButton({
	pending,
	disabled,
	again,
	onStart,
	onStop,
}: {
	pending: boolean;
	disabled?: boolean;
	/** There is already an answer, so this one replaces it. */
	again?: boolean;
	onStart: () => void;
	onStop: () => void;
}) {
	const { t } = useTranslation();

	if (pending) {
		return (
			<Button
				variant="ghost"
				size="sm"
				onClick={onStop}
				className="h-8 gap-1.5 rounded-lg"
			>
				{t("common.stop")}
			</Button>
		);
	}
	return (
		<Button
			variant="ghost"
			size="sm"
			disabled={disabled}
			onClick={onStart}
			className="h-8 gap-1.5 rounded-lg"
		>
			<SparklesIcon />
			{again ? t("ai.again") : t("ai.generate")}
		</Button>
	);
}

/** What can be said while waiting: how much went, and how long ago. Nothing
 *  streams. */
export function Generating({
	sent,
	seconds,
	chapters = false,
}: {
	sent: Sent | null;
	seconds: number;
	/** A question about the chapters picked, which is a line in the
	 *  conversation rather than a card of its own. */
	chapters?: boolean;
}) {
	const { t } = useTranslation();
	const chars = sent?.chars.toLocaleString();

	return (
		<div
			className={cn(
				"motion-rise flex items-center text-muted-foreground",
				chapters
					? "gap-2.5 text-sm"
					: "gap-3 rounded-xl border border-border bg-card px-4 py-3.5",
			)}
		>
			<Spinner className="size-4 shrink-0" />
			<span className="min-w-0 flex-1 truncate text-sm">
				{chars === undefined
					? t("ai.reading")
					: chapters
						? t("ai.sentChapters", { chars })
						: t("ai.sent", { chars })}
			</span>
			<span className="shrink-0 text-xs tabular-nums">
				{t("ai.elapsed", { seconds })}
			</span>
		</div>
	);
}

/** What the last call cost, as the endpoint reported it. Never a price. */
export function UsageLine({ usage }: { usage: Usage }) {
	const { t } = useTranslation();
	const tokens = (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0);
	if (!tokens && !usage.model) return null;

	return (
		<p className="text-muted-foreground text-xs tabular-nums">
			{t("ai.usage", {
				tokens: tokens.toLocaleString(),
				model: usage.model ?? "—",
			})}
		</p>
	);
}

/** The line above every generated thing. */
export function WholeBookNote() {
	const { t } = useTranslation();
	return (
		<p className="text-muted-foreground text-xs leading-relaxed">
			{t("ai.wholeBookNote")}
		</p>
	);
}
