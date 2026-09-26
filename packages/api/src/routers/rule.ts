import { z } from "zod";

import { suggestRule } from "../ai";
import { MAX_EXAMPLES } from "../ai/limits";
import { patternExampleSchema } from "../ai/pattern";
import { LOCALES } from "../ai/prompt";
import { publicProcedure, router } from "../index";
import {
	apply,
	pathRuleSchema,
	pathsOf,
	preview,
	ruleTargetSchema,
} from "../library/rule";

const ruled = z.object({
	shelfId: z.string(),
	target: ruleTargetSchema,
	rule: pathRuleSchema,
});

export const ruleRouter = router({
	/** What a path rule would write, book by book. Nothing is written. */
	preview: publicProcedure
		.input(ruled)
		.query(({ ctx, input }) =>
			preview(ctx.db, input.shelfId, input.target, input.rule),
		),

	/** Works a path rule out again and writes it, in a single transaction. */
	write: publicProcedure
		.input(ruled)
		.mutation(({ ctx, input }) =>
			apply(ctx.db, input.shelfId, input.target, input.rule),
		),

	/** The paths a path rule would be run over, for picking examples from. */
	paths: publicProcedure
		.input(z.object({ shelfId: z.string(), target: ruleTargetSchema }))
		.query(({ ctx, input }) => pathsOf(ctx.db, input.shelfId, input.target)),

	/** A path rule the model wrote from the reader's examples, tried on them
	 *  first. Nothing is written: the form takes it. */
	suggest: publicProcedure
		.input(
			z.object({
				shelfId: z.string(),
				target: ruleTargetSchema,
				examples: z.array(patternExampleSchema).max(MAX_EXAMPLES),
				locale: z.enum(LOCALES),
				run: z.string(),
			}),
		)
		.mutation(({ ctx, input }) =>
			suggestRule(
				ctx.db,
				ctx.ai,
				input.shelfId,
				input.target,
				input.examples,
				input.locale,
				input.run,
			),
		),
});
