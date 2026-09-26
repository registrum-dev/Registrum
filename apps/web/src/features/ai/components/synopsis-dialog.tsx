// The draft, shown before anything is kept.

import { Button } from "@registrum/ui/components/button";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AdaptiveDialog } from "@/components/adaptive-dialog";
import type { BookRecord } from "@/features/shelf/types";
import { api } from "@/lib/api";
import { useGeneration } from "../use-generation";
import { Generating, UsageLine } from "./generation-parts";

export function SynopsisDialog({
	open,
	onOpenChange,
	shelfId,
	book,
	onKeep,
	keeping = false,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	shelfId: string;
	book: BookRecord;
	/** Hands the draft over. The dialog does not close itself on it: what keeps
	 *  the synopsis says when it is kept, by closing this. */
	onKeep: (text: string) => void;
	/** Whether that write is still out. */
	keeping?: boolean;
}) {
	const { t } = useTranslation();

	const run = useGeneration<string>((run, locale) =>
		api.ai.generateSynopsis.mutate({
			shelfId,
			id: book.id,
			locale,
			runId: run,
		}),
	);

	// Opening the dialog is the act of asking for one: there is nothing else to
	// decide first, and a second button to press would only be a second click.
	const { start, stop, clear, pending } = run;
	useEffect(() => {
		if (open) start();
		// Closed from outside, which is how a kept synopsis ends: the draft goes
		// with it, so reopening asks again rather than showing the last answer.
		else clear();
	}, [open, start, clear]);

	const close = (next: boolean) => {
		if (!next) {
			if (pending) stop();
			clear();
		}
		onOpenChange(next);
	};

	return (
		<AdaptiveDialog
			open={open}
			onOpenChange={close}
			title={t("ai.synopsisTitle")}
			description={t("ai.synopsisNote")}
			className="sm:max-w-[560px]"
			kind="fit"
			footer={
				<>
					<Button
						variant="outline"
						disabled={keeping}
						onClick={() => close(false)}
					>
						{run.pending ? t("common.stop") : t("common.cancel")}
					</Button>
					<Button
						disabled={!run.result?.value || keeping}
						onClick={() => run.result?.value && onKeep(run.result.value)}
					>
						{t("ai.keepSynopsis")}
					</Button>
				</>
			}
		>
			<div className="flex flex-col gap-3">
				{run.pending && <Generating sent={run.sent} seconds={run.seconds} />}

				{run.result && (
					<>
						<p className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-card px-4 py-3.5 text-sm leading-loose">
							{run.result.value}
						</p>
						<UsageLine usage={run.result.usage} />
						{book.description && (
							<p className="text-destructive text-xs leading-relaxed">
								{t("ai.replaceWarning")}
							</p>
						)}
					</>
				)}
			</div>
		</AdaptiveDialog>
	);
}
