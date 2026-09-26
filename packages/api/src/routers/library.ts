import { z } from "zod";

import { dbProcedure, publicProcedure, router } from "../index";
import { findOne, forget } from "../library/book";
import { forgetCovers } from "../library/covers";
import { facets } from "../library/facets";
import { closeComic, openComic } from "../library/files";
import { bookPatchSchema, update } from "../library/patch";
import {
	books,
	LIST_FIELDS,
	libraryQuerySchema,
	pagingSchema,
	reach,
	SORT_KEYS,
	SORT_ORDERS,
} from "../library/query";
import {
	clearReading,
	markOpened,
	positionSchema,
	setProgress,
} from "../library/reading";
import { renameName } from "../library/rename";
import { cancelScan, restore, scan, scanProgress } from "../library/scan";
import { openShelf } from "../library/shelf";
import { NAME_KINDS } from "../vocabulary";
import { oneBook, onShelf } from "./inputs";

const someBooks = onShelf.extend({ ids: z.array(z.string()) });

export const libraryRouter = router({
	/** One page of the books on the shelf: the conditions applied, in the order
	 *  chosen. No paging asks for the whole shelf. */
	books: dbProcedure
		.input(
			onShelf.extend({
				query: libraryQuerySchema,
				sort: z.enum(SORT_KEYS),
				order: z.enum(SORT_ORDERS),
				paging: pagingSchema.nullable(),
			}),
		)
		.query(({ ctx, input }) =>
			books(
				ctx.db,
				input.shelfId,
				input.query,
				input.sort,
				input.order,
				input.paging,
			),
		),

	/** What the shelf holds, counted -- over the whole shelf, not the page. */
	facets: dbProcedure
		.input(onShelf)
		.query(({ ctx, input }) => facets(ctx.db, input.shelfId)),

	/** The values of one list some book would still carry under the other
	 *  conditions: what the filter can offer without leading to an empty shelf. */
	reach: dbProcedure
		.input(
			onShelf.extend({ query: libraryQuerySchema, field: z.enum(LIST_FIELDS) }),
		)
		.query(({ ctx, input }) =>
			reach(ctx.db, input.shelfId, input.query, input.field),
		),

	book: dbProcedure
		.input(oneBook)
		.query(({ ctx, input }) => findOne(ctx.db, input.shelfId, input.id)),

	/** The shelf a book is on, for a link to it opened in a browser looking at
	 *  another shelf, or at none. */
	shelfOf: dbProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const book = await ctx.db.book.findUnique({
				where: { id: input.id },
				select: { shelfId: true },
			});
			return book?.shelfId ?? null;
		}),

	/** Walks the folder, marks the books whose file has gone, and reads the books
	 *  the shelf does not know yet. Progress goes out on `scanProgress`. */
	scan: publicProcedure.input(onShelf).mutation(async ({ ctx, input }) => {
		const shelf = await openShelf(ctx.db, ctx.config, input.shelfId);
		return scan(ctx.db, ctx.config, shelf);
	}),

	/** Stops the run that is going, if one is. The books already read are still
	 *  written; the ones not yet opened are left for the next scan. */
	cancelScan: publicProcedure
		.input(onShelf)
		.mutation(({ input }) => cancelScan(input.shelfId)),

	/** How far the run on this shelf has got. */
	scanProgress: publicProcedure.input(onShelf).subscription(async function* ({
		input,
		signal,
	}) {
		yield* scanProgress(input.shelfId, signal);
	}),

	/** Reads these books again from their files, keeping what the reader added. */
	restore: publicProcedure.input(someBooks).mutation(async ({ ctx, input }) => {
		const shelf = await openShelf(ctx.db, ctx.config, input.shelfId);
		return restore(ctx.db, ctx.config, shelf, input.ids);
	}),

	/** One change, to one book or to a hundred, in a single transaction. */
	update: dbProcedure
		.input(someBooks.extend({ patch: bookPatchSchema }))
		.mutation(({ ctx, input }) =>
			update(ctx.db, input.shelfId, input.ids, input.patch),
		),

	/** Gives one of the shelf's names another spelling, taking every book that
	 *  carries it along. A name typed onto one the shelf already holds merges
	 *  the two. */
	renameName: dbProcedure
		.input(
			onShelf.extend({
				kind: z.enum(NAME_KINDS),
				from: z.string(),
				to: z.string(),
			}),
		)
		.mutation(({ ctx, input }) =>
			renameName(ctx.db, input.shelfId, input.kind, input.from, input.to),
		),

	setProgress: dbProcedure
		.input(oneBook.extend({ progress: positionSchema }))
		.mutation(({ ctx, input }) =>
			setProgress(ctx.db, input.shelfId, input.id, input.progress),
		),

	markOpened: dbProcedure
		.input(oneBook)
		.mutation(({ ctx, input }) => markOpened(ctx.db, input.shelfId, input.id)),

	/** Forgets where these books were read to and when they were last opened. */
	clearReading: dbProcedure
		.input(someBooks)
		.mutation(({ ctx, input }) =>
			clearReading(ctx.db, input.shelfId, input.ids),
		),

	/** Drops everything the shelf remembers about these books, thumbnails and
	 *  all. The book files themselves are never touched; a thumbnail that will
	 *  not go is not an error. */
	forget: dbProcedure.input(someBooks).mutation(async ({ ctx, input }) => {
		await forget(ctx.db, input.shelfId, input.ids);
		await forgetCovers(ctx.config, input.ids);
	}),

	/** Opens a comic archive for reading and holds it open. The pages themselves
	 *  come over `/api/comics/<key>/<page>`. */
	openComic: publicProcedure
		.input(z.object({ id: z.string() }))
		.mutation(({ ctx, input }) => openComic(ctx.db, ctx.config, input.id)),

	/** Lets that archive go. Called when the reader leaves the book. */
	closeComic: publicProcedure
		.input(z.object({ key: z.string() }))
		.mutation(({ input }) => closeComic(input.key)),
});
