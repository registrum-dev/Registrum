import { z } from "zod";

import { publicProcedure, router } from "../index";
import {
	browse,
	createShelf,
	listShelves,
	removeShelf,
	renameShelf,
} from "../library/shelf";

export const shelfRouter = router({
	/** Every shelf, and whether its folder is there right now. */
	list: publicProcedure.query(({ ctx }) => listShelves(ctx.db, ctx.config)),

	/** The folders inside one folder of the books mount. */
	browse: publicProcedure
		.input(z.object({ path: z.string() }))
		.query(({ ctx, input }) => browse(ctx.db, ctx.config, input.path)),

	/** Makes a folder a shelf. Nothing is read until it is scanned. */
	create: publicProcedure
		.input(z.object({ path: z.string(), name: z.string() }))
		.mutation(({ ctx, input }) =>
			createShelf(ctx.db, ctx.config, input.path, input.name),
		),

	rename: publicProcedure
		.input(z.object({ id: z.string(), name: z.string() }))
		.mutation(({ ctx, input }) => renameShelf(ctx.db, input.id, input.name)),

	/** Forgets a shelf and its records. The book files are never touched. */
	remove: publicProcedure
		.input(z.object({ id: z.string() }))
		.mutation(({ ctx, input }) => removeShelf(ctx.db, ctx.config, input.id)),
});
