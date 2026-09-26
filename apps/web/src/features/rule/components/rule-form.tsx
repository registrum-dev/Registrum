// The left half of the path rule: which books, the pattern, and the fields.

import { Checkbox } from "@registrum/ui/components/checkbox";
import { Input } from "@registrum/ui/components/input";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@registrum/ui/components/toggle-group";
import { cn } from "@registrum/ui/lib/utils";
import { useTranslation } from "react-i18next";
import { LabeledSelect } from "@/components/labeled-select";

import { modesOf, RULE_FIELDS, type RuleField } from "../fields";
import type { ScopeChoice } from "../queries";
import { type RuleScope, useRuleStore } from "../store";
import type { RuleTarget } from "../types";
import { groupTone } from "./rule-preview";
import { RuleSuggest } from "./rule-suggest";

export function RuleForm({
	choices,
	scope,
	target,
	active,
	groups,
	failure,
	className,
}: {
	choices: ScopeChoice[];
	/** The scope standing, which is the whole shelf once the one chosen is
	 *  no longer offered. */
	scope: RuleScope;
	target: RuleTarget;
	/** The page is up, so the example picker may ask for paths. */
	active: boolean;
	/** The pattern's named groups, as the server read them; none while it does not read. */
	groups: string[];
	/** Why the pattern does not read, if it does not. */
	failure: string | null;
	className?: string;
}) {
	const { t } = useTranslation();
	const pattern = useRuleStore((state) => state.pattern);
	const setPattern = useRuleStore((state) => state.setPattern);
	const fields = useRuleStore((state) => state.fields);
	const chosen = RULE_FIELDS.filter((field) => fields[field].on).length;

	return (
		<div className={cn("flex flex-col gap-7", className)}>
			<ScopePicker choices={choices} current={scope} />
			<RuleSuggest target={target} active={active} />

			<section className="flex flex-col gap-2.5">
				<div className="flex flex-wrap items-baseline justify-between gap-x-3">
					<label
						htmlFor="rule-pattern"
						className="font-semibold text-muted-foreground text-xs"
					>
						{t("rule.pattern")}
					</label>
					<span className="text-muted-foreground text-xs">
						{t("rule.patternHint")}
					</span>
				</div>
				<Input
					id="rule-pattern"
					value={pattern}
					onChange={(event) => setPattern(event.target.value)}
					spellCheck={false}
					autoComplete="off"
					autoCapitalize="off"
					aria-invalid={failure !== null || undefined}
					className="h-11 bg-muted/50 font-mono text-[13px]"
				/>
				{failure !== null && (
					<div
						role="alert"
						className="flex flex-col gap-1 text-destructive text-xs"
					>
						<span className="font-medium">{t("rule.badPattern")}</span>
						{failure && (
							<pre className="overflow-x-auto whitespace-pre font-mono">
								{failure}
							</pre>
						)}
					</div>
				)}
				{failure === null &&
					pattern !== "" &&
					(groups.length ? (
						<div className="flex flex-wrap items-center gap-1.5">
							<span className="mr-0.5 text-muted-foreground text-xs">
								{t("rule.groups")}
							</span>
							{groups.map((name, at) => (
								<code
									key={name}
									className={cn(
										"rounded px-1.5 py-0.5 font-mono text-xs",
										groupTone(at),
									)}
								>
									{`{${name}}`}
								</code>
							))}
						</div>
					) : (
						<p className="text-muted-foreground text-xs">
							{t("rule.noGroups")}
						</p>
					))}
			</section>

			<section className="flex flex-col gap-2.5">
				<div className="flex items-baseline justify-between gap-3">
					<h3 className="font-semibold text-muted-foreground text-xs">
						{t("rule.fields")}
					</h3>
					<span className="text-muted-foreground text-xs">
						{t("rule.fieldsChosen", { count: chosen })}
					</span>
				</div>
				<div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
					{RULE_FIELDS.map((field) => (
						<FieldRow key={field} field={field} groups={groups} />
					))}
				</div>
				<p className="text-muted-foreground text-xs leading-relaxed">
					{t("rule.fieldsHint")}
				</p>
			</section>
		</div>
	);
}

function ScopePicker({
	choices,
	current,
}: {
	choices: ScopeChoice[];
	current: RuleScope;
}) {
	const { t } = useTranslation();
	const setScope = useRuleStore((state) => state.setScope);
	const names = {
		shelf: t("rule.targetShelf"),
		filtered: t("rule.targetFiltered"),
		selected: t("rule.targetSelected"),
	};

	return (
		<section className="flex flex-col gap-2.5">
			<h3 className="font-semibold text-muted-foreground text-xs">
				{t("rule.target")}
			</h3>
			<ToggleGroup
				value={[current]}
				onValueChange={(value: string[]) => {
					const next = choices.find((choice) => choice.scope === value[0]);
					if (next) setScope(next.scope);
				}}
				aria-label={t("rule.target")}
				spacing={1}
				className="grid w-full rounded-xl bg-muted p-1"
				style={{
					gridTemplateColumns: `repeat(${choices.length}, minmax(0, 1fr))`,
				}}
			>
				{choices.map((choice) => (
					<ToggleGroupItem
						key={choice.scope}
						value={choice.scope}
						className="flex h-auto min-h-12 flex-col items-center justify-center gap-0 rounded-lg border-0 px-2 font-normal text-muted-foreground text-sm hover:bg-transparent hover:text-foreground aria-pressed:bg-card aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:shadow-sm aria-pressed:hover:bg-card"
					>
						<span className="truncate">{names[choice.scope]}</span>
						<span className="font-normal text-muted-foreground text-xs tabular-nums">
							{t("common.bookCount", { count: choice.count })}
						</span>
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</section>
	);
}

function FieldRow({ field, groups }: { field: RuleField; groups: string[] }) {
	const { t } = useTranslation();
	const draft = useRuleStore((state) => state.fields[field]);
	const setField = useRuleStore((state) => state.setField);
	const name = t(`ruleField.${field}`);

	return (
		<div
			className={cn(
				"flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-border border-t px-3 py-2 first:border-t-0",
				!draft.on && "bg-muted/40",
			)}
		>
			<label className="flex min-h-9 w-32 shrink-0 cursor-pointer items-center gap-2.5 font-medium text-sm">
				<Checkbox
					checked={draft.on}
					onCheckedChange={(on: boolean) => setField(field, { on })}
				/>
				{name}
			</label>
			<Input
				value={draft.template}
				onChange={(event) =>
					setField(field, { template: event.target.value, on: true })
				}
				placeholder={groups[0] ? `{${groups[0]}}` : undefined}
				aria-label={t("rule.fieldValue", { field: name })}
				spellCheck={false}
				autoComplete="off"
				className={cn(
					"h-9 min-w-32 flex-1 font-mono text-[13px]",
					!draft.on && "text-muted-foreground",
				)}
			/>
			<LabeledSelect
				value={draft.mode}
				options={modesOf(field).map((mode) => ({
					value: mode,
					label: t(`ruleMode.${mode}`),
				}))}
				onValueChange={(mode) =>
					setField(field, { mode: mode as typeof draft.mode })
				}
				aria-label={t("rule.fieldMode", { field: name })}
				size="sm"
				className="w-32 shrink-0"
			/>
		</div>
	);
}
