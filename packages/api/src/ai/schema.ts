// What the model is asked to answer in. Every description below is sent with
// the request, so these lines are instructions to the model.

import { z } from "zod";

import { CHARACTER_ROLES, RULE_FIELDS } from "../vocabulary";

export const characterListSchema = z.object({
	characters: z.array(
		z.object({
			name: z.string(),
			aliases: z.array(z.string()),
			role: z.enum(CHARACTER_ROLES),
			overview: z.string(),
			personality: z.string(),
			appearance: z.string(),
			speech: z.string(),
			affiliation: z.string(),
			events: z.array(z.string()),
		}),
	),
});
export type CharacterAnswer = z.infer<
	typeof characterListSchema
>["characters"][number];

export const relationListSchema = z.object({
	relations: z.array(
		z.object({
			from: z.string(),
			to: z.string(),
			label: z.string(),
			mutual: z.boolean().meta({
				description:
					"false: an arrow from `from` to `to`, for a tie only one of them holds.\ntrue: a plain line, for a tie they hold equally.",
			}),
		}),
	),
});
export type RelationAnswer = z.infer<
	typeof relationListSchema
>["relations"][number];

export const ruleAnswerSchema = z.object({
	pattern: z.string().meta({
		description:
			"A JavaScript regular expression, used with the u flag. Name every group that is used: (?<name>...).",
	}),
	fields: z
		.array(
			z.object({
				field: z.enum(RULE_FIELDS),
				template: z.string().meta({
					description:
						"The text to write into the field. `{name}` stands for what the group of that name caught; anything else is written as it is.",
				}),
			}),
		)
		.meta({
			description: "One entry for each field the examples give a value for.",
		}),
});
export type RuleAnswer = z.infer<typeof ruleAnswerSchema>;
