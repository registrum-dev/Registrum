import { z } from "zod";

import {
	ask,
	askedSchema,
	bookChapters,
	generateCharacters,
	generateRelations,
	generateSynopsis,
} from "../ai";
import { sentNotices, stopGeneration } from "../ai/generations";
import { LOCALES } from "../ai/prompt";
import { aiSettingsOf } from "../ai/settings";
import type { Context } from "../context";
import { dbProcedure, publicProcedure, router } from "../index";
import { findBook } from "../library/book";
import { savedAiOf } from "../library/character";
import { bookInput } from "./inputs";

const generationInput = bookInput.extend({
	locale: z.enum(LOCALES),
	runId: z.string(),
});

/** A call's input, with the context it runs against. */
function withContext<T>(ctx: Context, input: T): T & Context {
	return { ...input, db: ctx.db, config: ctx.config, ai: ctx.ai };
}

export const aiRouter = router({
	/** The endpoint and model, and whether a key has been given. The key itself
	 *  never goes out. */
	settings: publicProcedure.query(({ ctx }) => aiSettingsOf(ctx.ai)),

	/** What a book already carries: the characters, and the relations between
	 *  them. */
	saved: dbProcedure.input(bookInput).query(async ({ ctx, input }) => {
		// Only a book on this shelf is asked about.
		if (!(await findBook(ctx.db, input.shelfId, input.id))) {
			return { characters: null, relations: null };
		}
		return savedAiOf(ctx.db, input.id);
	}),

	/** The chapters one question may be asked about, and the ones already read.
	 *  `at` is where the reader is right now, which only the reader screen knows. */
	chapters: publicProcedure
		.input(bookInput.extend({ at: z.number().int().nullable() }))
		.query(({ ctx, input }) => bookChapters(withContext(ctx, input), input.at)),

	/** A synopsis written from the whole book, and not written down. */
	generateSynopsis: publicProcedure
		.input(generationInput)
		.mutation(({ ctx, input }) => generateSynopsis(withContext(ctx, input))),

	/** The book's characters, written down in the same call that asked for them. */
	generateCharacters: publicProcedure
		.input(generationInput)
		.mutation(({ ctx, input }) => generateCharacters(withContext(ctx, input))),

	/** The ties between the people already written down. */
	generateRelations: publicProcedure
		.input(generationInput)
		.mutation(({ ctx, input }) => generateRelations(withContext(ctx, input))),

	/** One question about the chapters the reader picked. Nothing is written down. */
	ask: publicProcedure
		.input(generationInput.extend({ asked: askedSchema }))
		.mutation(({ ctx, input }) => ask(withContext(ctx, input), input.asked)),

	/** Stops a generationInput that is still out. Saying so about one that has already
	 *  answered does nothing: the answer and the button can cross. */
	stop: publicProcedure
		.input(z.object({ runId: z.string() }))
		.mutation(({ input }) => stopGeneration(input.runId)),

	/** Said once per generationInput, when the book has been read and before any of
	 *  it goes. */
	onSent: publicProcedure.subscription(async function* ({ signal }) {
		yield* sentNotices(signal);
	}),
});
