// The path rule's page: the rule on one side, what it would write on the
// other.

import { Button } from "@registrum/ui/components/button";
import { ScrollArea } from "@registrum/ui/components/scroll-area";
import { Spinner } from "@registrum/ui/components/spinner";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Confirm } from "@/components/confirm";
import { SheetBar, SheetSurface } from "@/components/phone-sheet";
import { useFormFactor } from "@/hooks/use-form-factor";
import { describeError, showNotice } from "@/store/alert";
import {
	useApplyRule,
	useRuleDraft,
	useRulePreview,
	useRuleTarget,
} from "../queries";
import type { PathRule, RulePreview, RuleTarget } from "../types";
import { RuleForm } from "./rule-form";
import { RulePreviewList } from "./rule-preview";

export function RuleSheet({
	open,
	appear,
}: {
	open: boolean;
	appear: boolean;
}) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const toShelf = useCallback(() => void navigate({ to: "/" }), [navigate]);

	return (
		<SheetSurface
			open={open}
			kind="page"
			label={t("rule.title")}
			modal={false}
			appear={appear}
			onClose={toShelf}
			className="max-w-6xl"
		>
			<SheetBar title={t("rule.title")} onClose={toShelf} />
			<RulePage open={open} />
		</SheetSurface>
	);
}

function RulePage({ open }: { open: boolean }) {
	const { t } = useTranslation();
	const { choices, scope, target } = useRuleTarget();
	const rule = useRuleDraft();
	const { preview, settled } = useRulePreview(target, rule, open);
	const wide = useFormFactor() === "desktop";

	const failure =
		rule.pattern !== "" && preview.isError
			? describeError(preview.error)
			: null;
	const shown =
		rule.pattern === "" || failure !== null ? undefined : preview.data;
	const empty =
		rule.pattern === ""
			? t("rule.noPattern")
			: failure !== null
				? t("rule.fixPattern")
				: shown
					? null
					: t("common.loading");

	const form = (
		<RuleForm
			choices={choices}
			scope={scope}
			target={target}
			active={open}
			groups={shown?.groups ?? []}
			failure={failure}
			className="desktop:p-6 p-4"
		/>
	);
	const fetching = preview.isFetching && (
		<Spinner className="absolute top-5 desktop:right-7 right-4 z-20 size-4 text-muted-foreground" />
	);
	const list = <RulePreviewList preview={shown} empty={empty} />;

	return (
		<>
			{wide ? (
				<div className="flex min-h-0 flex-1">
					<ScrollArea className="w-[27rem] shrink-0 border-border border-e">
						{form}
					</ScrollArea>
					<div className="relative flex min-w-0 flex-1 flex-col">
						{fetching}
						<ScrollArea className="min-h-0 flex-1">{list}</ScrollArea>
					</div>
				</div>
			) : (
				<ScrollArea className="min-h-0 flex-1">
					<div className="border-border border-b">{form}</div>
					<div className="relative">
						{fetching}
						{list}
					</div>
				</ScrollArea>
			)}
			<RuleDock
				preview={shown}
				settling={!settled}
				target={target}
				rule={rule}
			/>
		</>
	);
}

function RuleDock({
	preview,
	settling,
	target,
	rule,
}: {
	preview: RulePreview | undefined;
	/** The preview on screen is for a rule that has since changed. */
	settling: boolean;
	target: RuleTarget;
	rule: PathRule;
}) {
	const { t } = useTranslation();
	const apply = useApplyRule();
	const [confirming, setConfirming] = useState(false);
	const changed = preview?.changed ?? 0;

	const tallies = (preview?.fields ?? [])
		.map((tally) =>
			tally.overwrites
				? t("rule.fieldTallyOverwrite", {
						field: t(`ruleField.${tally.field}`),
						count: tally.books,
						overwrites: tally.overwrites,
					})
				: t("rule.fieldTally", {
						field: t(`ruleField.${tally.field}`),
						count: tally.books,
					}),
		)
		.join(t("common.listSeparator"));

	return (
		<div className="flex shrink-0 items-center gap-4 border-border border-t bg-card desktop:px-7 px-4 pt-3 pb-[calc(0.75rem+var(--safe-bottom))]">
			<div className="flex min-w-0 flex-1 flex-col">
				<span className="font-semibold text-sm tabular-nums">
					{changed
						? t("rule.writeTally", {
								count: changed,
								cells: preview?.cells ?? 0,
							})
						: t("rule.nothingToWrite")}
				</span>
				{Boolean(preview?.overwrites) && (
					<span className="text-orange-800 text-xs dark:text-orange-300">
						{t("rule.overwrites", { count: preview?.overwrites ?? 0 })}
					</span>
				)}
			</div>
			<Button
				size="lg"
				disabled={!changed || settling || apply.isPending}
				onClick={() => setConfirming(true)}
				className="rounded-xl px-5"
			>
				{apply.isPending && <Spinner />}
				{t("rule.write")}
			</Button>

			<Confirm
				open={confirming}
				onOpenChange={setConfirming}
				title={t("rule.confirmTitle", { count: changed })}
				description={t("rule.confirmDescription", { fields: tallies })}
				confirmLabel={t("rule.confirm")}
				destructive={false}
				onConfirm={() => {
					setConfirming(false);
					apply.mutate(
						{ target, rule },
						{
							onSuccess: (applied) =>
								showNotice(t("rule.applied", { count: applied.books })),
						},
					);
				}}
			/>
		</div>
	);
}
