// The fields a path rule can fill, as the form keeps them while they are typed.
// Which fields there are, and what can be done to each, are the server's
// (`RULE_FIELDS`, `modesOf`).

import {
	modesOf,
	RULE_FIELDS,
	type RuleField,
	type RuleMode,
} from "@registrum/api/types";

export type { RuleField, RuleMode };
export { modesOf, RULE_FIELDS };

export interface FieldDraft {
	on: boolean;
	template: string;
	mode: RuleMode;
}

export type FieldDrafts = Record<RuleField, FieldDraft>;

export const NO_FIELDS = Object.fromEntries(
	RULE_FIELDS.map((field) => [
		field,
		{ on: false, template: "", mode: "overwrite" },
	]),
) as FieldDrafts;
