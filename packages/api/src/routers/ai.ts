import { z } from "zod";

import {
	ask,
	askedSchema,
	bookChapters,
	characters,
	graph,
	synopsis,
} from "../ai";
import { LOCALES } from "../ai/prompt";
import { generationSent, stopGeneration } from "../ai/runs";
import { aiSettingsOf } from "../ai/settings";
import type { Context } from "../context";
import { dbProcedure, publicProcedure, router } from "../index";
import { findOne } from "../library/book";
import { aiOf } from "../library/character";
import { oneBook } from "./inputs";

const generation = oneBook.extend({ locale: z.enum(LOCALES), run: z.string() });

/** A call's input, with the library it runs against. */
function withLibrary<T>(ctx: Context, input: T): T & Context {
	return { ...input, db: ctx.db, config: ctx.config, ai: ctx.ai };
}

export const aiRouter = router({
	/** The endpoint and model, and whether a key has been given. The key itself
	 *  never goes out. */
	settings: publicProcedure.query(({ ctx }) => aiSettingsOf(ctx.ai)),

	/** What a book already carries: the cast, and the map of their ties. */
	bookAi: dbProcedure.input(oneBook).query(async ({ ctx, input }) => {
		// Only a book on this shelf is asked about.
		if (!(await findOne(ctx.db, input.shelfId, input.id))) {
			return { characters: null, graph: null };
		}
		return aiOf(ctx.db, input.id);
	}),

	/** The chapters one question may be asked about, and the ones already read.
	 *  `at` is where the reader is right now, which only the reader screen knows. */
	chapters: publicProcedure
		.input(oneBook.extend({ at: z.number().int().nullable() }))
		.query(({ ctx, input }) => bookChapters(withLibrary(ctx, input), input.at)),

	/** A synopsis written from the whole book, and not written down. */
	synopsis: publicProcedure
		.input(generation)
		.mutation(({ ctx, input }) => synopsis(withLibrary(ctx, input))),

	/** The book's cast, written down in the same call that asked for it. */
	characters: publicProcedure
		.input(generation)
		.mutation(({ ctx, input }) => characters(withLibrary(ctx, input))),

	/** The ties between the people already written down. */
	graph: publicProcedure
		.input(generation)
		.mutation(({ ctx, input }) => graph(withLibrary(ctx, input))),

	/** One question about the chapters the reader picked. Nothing is written down. */
	ask: publicProcedure
		.input(generation.extend({ asked: askedSchema }))
		.mutation(({ ctx, input }) => ask(withLibrary(ctx, input), input.asked)),

	/** Stops a generation that is still out. Saying so about one that has already
	 *  answered does nothing: the answer and the button can cross. */
	stop: publicProcedure
		.input(z.object({ run: z.string() }))
		.mutation(({ input }) => stopGeneration(input.run)),

	/** Said once per generation, when the book has been read and before any of
	 *  it goes. */
	sent: publicProcedure.subscription(async function* ({ signal }) {
		yield* generationSent(signal);
	}),
});
