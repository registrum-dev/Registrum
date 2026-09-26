// The rule being written, kept while the app is open.

import { MAX_EXAMPLES } from "@registrum/api/types";
import { create } from "zustand";

import {
	type FieldDraft,
	type FieldDrafts,
	NO_FIELDS,
	RULE_FIELDS,
	type RuleField,
} from "./fields";
import type { PatternDraft } from "./types";

/** Which books the rule is run over. */
export type RuleScope = "shelf" | "filtered" | "selected";

/** A book held up for the model, and what the reader wants out of it. */
export interface ExampleDraft {
	path: string;
	values: Partial<Record<RuleField, string>>;
}

interface RuleState {
	pattern: string;
	fields: FieldDrafts;
	scope: RuleScope;
	/** The books handed over from the bulk bar. */
	ids: string[];
	examples: ExampleDraft[];
	/** The fields every example is given a value for. */
	askFields: RuleField[];

	setPattern: (pattern: string) => void;
	setField: (field: RuleField, change: Partial<FieldDraft>) => void;
	setScope: (scope: RuleScope) => void;
	/** Opens on these books; none opens on the whole shelf. */
	handOver: (ids: string[]) => void;
	addExample: (path: string) => void;
	removeExample: (path: string) => void;
	setExampleValue: (path: string, field: RuleField, value: string) => void;
	toggleAskField: (field: RuleField) => void;
	/** The model's rule: its fields ticked with the way of writing each already
	 *  had, every other field unticked. */
	takeDraft: (draft: PatternDraft) => void;
}

/** Whether this path can still be held up: there is room, and it is not held
 *  up already. */
export function canAddExample(
	state: Pick<RuleState, "examples">,
	path: string,
): boolean {
	return (
		state.examples.length < MAX_EXAMPLES &&
		!state.examples.some((each) => each.path === path)
	);
}

export const useRuleStore = create<RuleState>()((set) => ({
	pattern: "",
	fields: NO_FIELDS,
	scope: "shelf",
	ids: [],
	examples: [],
	askFields: [],

	setPattern: (pattern) => set({ pattern }),
	setField: (field, change) =>
		set((state) => ({
			fields: {
				...state.fields,
				[field]: { ...state.fields[field], ...change },
			},
		})),
	setScope: (scope) => set({ scope }),
	handOver: (ids) => set({ ids, scope: ids.length ? "selected" : "shelf" }),
	addExample: (path) =>
		set((state) =>
			canAddExample(state, path)
				? { examples: [...state.examples, { path, values: {} }] }
				: state,
		),
	removeExample: (path) =>
		set((state) => ({
			examples: state.examples.filter((each) => each.path !== path),
		})),
	setExampleValue: (path, field, value) =>
		set((state) => ({
			examples: state.examples.map((each) =>
				each.path === path
					? { ...each, values: { ...each.values, [field]: value } }
					: each,
			),
		})),
	toggleAskField: (field) =>
		set((state) => ({
			askFields: state.askFields.includes(field)
				? state.askFields.filter((each) => each !== field)
				: RULE_FIELDS.filter(
						(each) => each === field || state.askFields.includes(each),
					),
		})),
	takeDraft: (draft) =>
		set((state) => ({
			pattern: draft.pattern,
			fields: Object.fromEntries(
				RULE_FIELDS.map((field) => {
					const given = draft.fields.find((each) => each.field === field);
					return [
						field,
						given
							? { ...state.fields[field], on: true, template: given.template }
							: { ...state.fields[field], on: false },
					];
				}),
			) as FieldDrafts,
		})),
}));
