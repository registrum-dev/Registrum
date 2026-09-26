// Asking the model for the pattern, from books the reader holds up as
// examples.

import { MAX_EXAMPLES } from "@registrum/api/types";
import { Button } from "@registrum/ui/components/button";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@registrum/ui/components/combobox";
import { Input } from "@registrum/ui/components/input";
import { Spinner } from "@registrum/ui/components/spinner";
import { Toggle } from "@registrum/ui/components/toggle";
import { cn } from "@registrum/ui/lib/utils";
import { SparklesIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { UsageLine } from "@/features/ai/components/generation-parts";
import { useAiConfigured } from "@/features/ai/queries";
import { useGeneration } from "@/features/ai/use-generation";
import { useShelfId } from "@/features/shelf/queries";
import { api } from "@/lib/api";
import { foldIncludes } from "@/lib/fold";

import { RULE_FIELDS } from "../fields";
import { useRulePaths } from "../queries";
import { type ExampleDraft, useRuleStore } from "../store";
import type { PatternDraft, PatternExample, RuleTarget } from "../types";

/** More than this many paths in the picker is left to typing. */
const PICKER_LIMIT = 50;

export function RuleSuggest({
	target,
	active,
}: {
	target: RuleTarget;
	active: boolean;
}) {
	const { t } = useTranslation();
	const configured = useAiConfigured();
	const { shelfId } = useShelfId();
	const examples = useRuleStore((state) => state.examples);
	const askFields = useRuleStore((state) => state.askFields);
	const toggleAskField = useRuleStore((state) => state.toggleAskField);
	const takeDraft = useRuleStore((state) => state.takeDraft);

	const asked: PatternExample[] = examples.map((example) => ({
		path: example.path,
		values: askFields
			.map((field) => ({ field, value: example.values[field] ?? "" }))
			.filter((value) => value.value.trim() !== ""),
	}));
	const ready = asked.some((example) => example.values.length > 0);

	const generation = useGeneration<PatternDraft>(
		// A rule the model wrote from the examples, already tried on them.
		// Nothing is written: the form takes it.
		(run, locale) =>
			api.rule.suggest.mutate({
				shelfId,
				target,
				examples: asked,
				locale,
				runId: run,
			}),
		takeDraft,
	);
	const draft = generation.result?.value;

	if (!configured) {
		return (
			<section className="flex flex-col gap-2.5">
				<h3 className="font-semibold text-muted-foreground text-xs">
					{t("rule.askTitle")}
				</h3>
				<p className="text-muted-foreground text-xs">{t("ai.notConfigured")}</p>
			</section>
		);
	}

	return (
		<section className="flex flex-col gap-2.5">
			<h3 className="font-semibold text-muted-foreground text-xs">
				{t("rule.askTitle")}
			</h3>
			<p className="text-muted-foreground text-xs leading-relaxed">
				{t("rule.askHint")}
			</p>

			<div className="flex flex-wrap items-center gap-1.5">
				<span className="mr-0.5 text-muted-foreground text-xs">
					{t("rule.askFields")}
				</span>
				{RULE_FIELDS.map((field) => (
					<Toggle
						key={field}
						pressed={askFields.includes(field)}
						onPressedChange={() => toggleAskField(field)}
						className="h-7 min-w-0 rounded-full border-input bg-card px-2.5 font-normal text-xs hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary"
					>
						{t(`ruleField.${field}`)}
					</Toggle>
				))}
			</div>

			{examples.map((example) => (
				<ExampleCard key={example.path} example={example} />
			))}
			{examples.length < MAX_EXAMPLES && (
				<ExamplePicker target={target} active={active} />
			)}

			<div className="flex flex-wrap items-center gap-3">
				{generation.pending ? (
					<>
						<Spinner className="size-4 text-muted-foreground" />
						<span className="text-muted-foreground text-sm">
							{t("rule.asking")}
						</span>
						<span className="text-muted-foreground text-xs tabular-nums">
							{t("ai.elapsed", { seconds: generation.seconds })}
						</span>
						<Button
							variant="ghost"
							size="sm"
							onClick={generation.stop}
							className="ml-auto h-8 rounded-lg"
						>
							{t("common.stop")}
						</Button>
					</>
				) : (
					<>
						<Button
							variant="outline"
							size="sm"
							disabled={!ready}
							onClick={generation.start}
							className="h-8 gap-1.5 rounded-lg"
						>
							<SparklesIcon />
							{t("rule.ask")}
						</Button>
						{!ready && examples.length > 0 && (
							<span className="text-muted-foreground text-xs">
								{t("rule.askNeedsValues")}
							</span>
						)}
					</>
				)}
			</div>

			{draft && !generation.pending && (
				<div className="flex flex-col gap-1">
					<p
						className={cn(
							"text-xs",
							draft.misses
								? "text-orange-800 dark:text-orange-300"
								: "text-muted-foreground",
						)}
					>
						{draft.misses
							? t("rule.askMissed", { count: draft.misses })
							: draft.attempts > 1
								? t("rule.askFittedAfter", { attempts: draft.attempts })
								: t("rule.askFitted")}
					</p>
					{generation.result && <UsageLine usage={generation.result.usage} />}
				</div>
			)}

			<p className="text-muted-foreground text-xs leading-relaxed">
				{t("rule.askNote")}
			</p>
		</section>
	);
}

function ExampleCard({ example }: { example: ExampleDraft }) {
	const { t } = useTranslation();
	const askFields = useRuleStore((state) => state.askFields);
	const removeExample = useRuleStore((state) => state.removeExample);
	const setExampleValue = useRuleStore((state) => state.setExampleValue);

	return (
		<div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
			<div className="flex items-start gap-2 bg-muted/40 px-3 py-2">
				<p className="min-w-0 flex-1 select-text break-all font-mono text-xs leading-relaxed">
					{example.path}
				</p>
				<Button
					variant="ghost"
					size="icon-xs"
					onClick={() => removeExample(example.path)}
					aria-label={t("rule.removeExample")}
				>
					<XIcon />
				</Button>
			</div>
			{askFields.map((field) => {
				const name = t(`ruleField.${field}`);
				return (
					<label
						key={field}
						className="flex items-center gap-2.5 border-border border-t px-3 py-1.5 text-sm"
					>
						<span className="w-24 shrink-0 text-muted-foreground text-xs">
							{name}
						</span>
						<Input
							value={example.values[field] ?? ""}
							onChange={(event) =>
								setExampleValue(example.path, field, event.target.value)
							}
							aria-label={t("rule.exampleValue", { field: name })}
							spellCheck={false}
							autoComplete="off"
							className="h-8 min-w-0 flex-1 text-[13px]"
						/>
					</label>
				);
			})}
		</div>
	);
}

function ExamplePicker({
	target,
	active,
}: {
	target: RuleTarget;
	active: boolean;
}) {
	const { t } = useTranslation();
	const paths = useRulePaths(target, active);
	const addExample = useRuleStore((state) => state.addExample);
	const [typed, setTyped] = useState("");

	return (
		<Combobox
			items={paths.data ?? []}
			value={null}
			onValueChange={(path: string | null) => {
				if (path) addExample(path);
				setTyped("");
			}}
			inputValue={typed}
			onInputValueChange={setTyped}
			filter={foldIncludes}
			limit={PICKER_LIMIT}
		>
			<ComboboxInput placeholder={t("rule.addExample")} className="w-full" />
			<ComboboxContent>
				<ComboboxEmpty>{t("rule.noPaths")}</ComboboxEmpty>
				<ComboboxList>
					{(path: string) => (
						<ComboboxItem
							key={path}
							value={path}
							className="break-all font-mono text-xs"
						>
							{path}
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}
