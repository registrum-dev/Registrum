// A path rule, written by the model from the reader's examples and tried on them
// here before the screen sees it.

import { isDeepStrictEqual } from "node:util";
import type { Database } from "@registrum/db";
import { z } from "zod";

import { Failure } from "../failure";
import { charCount } from "../lib/text";
import {
	compile,
	evaluateTemplate,
	type Pattern,
	pathsOf,
	type RuleTarget,
	type RuleValue,
	readAs,
} from "../library/rule";
import { RULE_FIELDS, type RuleField } from "../vocabulary";
import { askForShape, type Generated, type Usage } from "./client";
import { MAX_EXAMPLES } from "./limits";
import { type Locale, type RuleMiss, ruleAgain, rulePrompt } from "./prompt";
import { type RuleAnswer, ruleAnswerSchema } from "./schema";
import type { Connection } from "./settings";

/** How many other paths go with the examples, so that the answer fits more than
 *  the books it was shown. */
const OTHER_PATHS = 30;

/** How many times the model is asked in all: once, and twice more with what its
 *  answer got wrong. */
const ATTEMPTS = 3;

export const patternExampleSchema = z.object({
	path: z.string(),
	values: z.array(z.object({ field: z.enum(RULE_FIELDS), value: z.string() })),
});
/** One book the reader held up, and what each field should come out as. */
export type PatternExample = z.infer<typeof patternExampleSchema>;

/** The rule the model wrote, for the form to take. */
export interface PatternDraft {
	pattern: string;
	fields: { field: RuleField; template: string }[];
	/** How many times the model was asked. */
	attempts: number;
	/** The examples the last answer still gets wrong. None when it fits them all. */
	misses: number;
}

/** An example, read: the path as the pattern sees it, and each value as the
 *  field would hold it. */
interface Wanted {
	path: string;
	values: [RuleField, string, RuleValue][];
}

/** Asks for a rule, tries it on the examples, and asks again with what it got
 *  wrong. The last answer comes back whether it fits or not: the form and the
 *  preview are where the reader decides. */
export async function draftRule(
	db: Database,
	shelfId: string,
	target: RuleTarget,
	examples: readonly PatternExample[],
	connection: Connection,
	locale: Locale,
	controller: AbortController,
): Promise<Generated<PatternDraft>> {
	const wanted = readExamples(examples);
	const fields = fieldsOf(wanted);

	const paths = await pathsOf(db, shelfId, target);
	const others = spread(
		paths.filter((path) => !wanted.some((example) => example.path === path)),
	);

	let asked = rulePrompt(
		wanted.map((example) => ({
			path: example.path,
			values: example.values.map(([field, raw]) => [field, raw]),
		})),
		others,
		locale,
	);
	const sent = { chars: charCount(asked.user) };

	const usage: Usage = {
		promptTokens: null,
		completionTokens: null,
		model: null,
	};
	for (let attempts = 1; ; attempts += 1) {
		const answered = await askForShape(
			connection,
			asked,
			ruleAnswerSchema,
			controller,
		);
		add(usage, answered.usage);
		const answer = answered.value;
		const misses = check(answer, wanted, fields);
		if (misses.length === 0 || attempts === ATTEMPTS) {
			return {
				value: draft(answer, fields, attempts, missedExamples(misses, wanted)),
				usage,
				sent,
			};
		}
		asked = ruleAgain(asked, JSON.stringify(answer), misses, locale);
	}
}

/** The examples, each value read as its field would hold it. A value that
 *  cannot be one is refused before anything is sent: no pattern could give it. */
function readExamples(examples: readonly PatternExample[]): Wanted[] {
	const wanted: Wanted[] = [];
	for (const example of examples.slice(0, MAX_EXAMPLES)) {
		const values: Wanted["values"] = [];
		for (const { field, value } of example.values) {
			const raw = value.trim();
			if (raw === "") continue;
			const read = readAs(field, raw);
			if ("skip" in read) throw new Failure("badExample", raw);
			values.push([field, raw, read.value]);
		}
		if (values.length > 0)
			wanted.push({ path: example.path.replaceAll("\\", "/"), values });
	}
	if (wanted.length === 0) throw Failure.bare("noExample");
	return wanted;
}

/** Every field some example gives a value for, in the order the form lists them. */
function fieldsOf(wanted: readonly Wanted[]): RuleField[] {
	const fields = new Set(
		wanted.flatMap((example) => example.values.map(([field]) => field)),
	);
	return RULE_FIELDS.filter((field) => fields.has(field));
}

/** At most `OTHER_PATHS`, taken evenly from the whole list rather than from its
 *  start, which is one folder. */
function spread(paths: string[]): string[] {
	if (paths.length <= OTHER_PATHS) return paths;
	const step = paths.length / OTHER_PATHS;
	return Array.from(
		{ length: OTHER_PATHS },
		(_, at) => paths[Math.floor(at * step)] as string,
	);
}

/** A value as the model is told it came out. */
function shown(value: RuleValue): string {
	switch (value.kind) {
		case "empty":
			return "";
		case "list":
			return value.value.join(", ");
		default:
			return String(value.value);
	}
}

/** Everything the answer gets wrong about the examples. */
function check(
	answer: RuleAnswer,
	wanted: readonly Wanted[],
	fields: readonly RuleField[],
): RuleMiss[] {
	let pattern: Pattern;
	try {
		pattern = compile(answer.pattern);
	} catch (error) {
		return [
			{
				kind: "unreadable",
				error: error instanceof Failure ? error.detail : String(error),
			},
		];
	}

	const misses: RuleMiss[] = fields
		.filter((field) => !answer.fields.some((each) => each.field === field))
		.map((field) => ({ kind: "noTemplate", field }));

	for (const example of wanted) {
		if (!pattern.regex.test(example.path)) {
			misses.push({ kind: "missed", path: example.path });
			continue;
		}
		for (const [field, raw, want] of example.values) {
			const template = answer.fields.find((each) => each.field === field);
			if (!template) continue;
			const got = evaluateTemplate(
				pattern,
				field,
				template.template,
				example.path,
			);
			const fits =
				got !== null && "value" in got && isDeepStrictEqual(got.value, want);
			if (!fits) {
				misses.push({
					kind: "wrong",
					path: example.path,
					field,
					want: raw,
					got:
						got === null ? null : "value" in got ? shown(got.value) : got.raw,
				});
			}
		}
	}
	return misses;
}

/** How many examples the misses are about. A pattern that does not compile, or
 *  a field with no template, misses them all. */
function missedExamples(
	misses: readonly RuleMiss[],
	wanted: readonly Wanted[],
): number {
	const paths = new Set<string>();
	for (const miss of misses) {
		if (miss.kind === "unreadable" || miss.kind === "noTemplate")
			return wanted.length;
		paths.add(miss.path);
	}
	return paths.size;
}

/** The answer as the form takes it: only the fields the examples asked for. */
function draft(
	answer: RuleAnswer,
	fields: readonly RuleField[],
	attempts: number,
	misses: number,
): PatternDraft {
	return {
		pattern: answer.pattern,
		fields: fields.flatMap((field) => {
			const found = answer.fields.find((each) => each.field === field);
			return found ? [{ field, template: found.template }] : [];
		}),
		attempts,
		misses,
	};
}

function add(sum: Usage, more: Usage): void {
	const plus = (a: number | null, b: number | null) =>
		a === null && b === null ? null : (a ?? 0) + (b ?? 0);
	sum.promptTokens = plus(sum.promptTokens, more.promptTokens);
	sum.completionTokens = plus(sum.completionTokens, more.completionTokens);
	sum.model = more.model ?? sum.model;
}
