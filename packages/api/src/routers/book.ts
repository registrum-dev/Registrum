import { z } from "zod";

import { dbProcedure, publicProcedure, router } from "../index";
import { findBook, removeBooks } from "../library/book";
import { removeCovers } from "../library/covers";
import { facets } from "../library/facets";
import { closeComic, openComic } from "../library/files";
import { bookPatchSchema, update } from "../library/patch";
import {
	clearPosition,
	markOpened,
	positionSchema,
	setPosition,
} from "../library/position";
import {
	bookFilterSchema,
	FILTER_FIELDS,
	filterOptions,
	listBooks,
	pagingSchema,
	SORT_KEYS,
	SORT_ORDERS,
} from "../library/query";
import { renameFacet } from "../library/rename";
import { onScanProgress, rescan, scan, stopScan } from "../library/scan";
import { openShelf } from "../library/shelf";
import { FACET_KINDS } from "../vocabulary";
import { bookInput, shelfInput } from "./inputs";

const booksInput = shelfInput.extend({ ids: z.array(z.string()) });

export const bookRouter = router({
	/** One page of the books on the shelf: the conditions applied, in the order
	 *  chosen. No paging asks for the whole shelf. */
	list: dbProcedure
		.input(
			shelfInput.extend({
				filter: bookFilterSchema,
				sort: z.enum(SORT_KEYS),
				order: z.enum(SORT_ORDERS),
				paging: pagingSchema.nullable(),
			}),
		)
		.query(({ ctx, input }) =>
			listBooks(
				ctx.db,
				input.shelfId,
				input.filter,
				input.sort,
				input.order,
				input.paging,
			),
		),

	/** What the shelf holds, counted -- over the whole shelf, not the page. */
	facets: dbProcedure
		.input(shelfInput)
		.query(({ ctx, input }) => facets(ctx.db, input.shelfId)),

	/** The values of one list some book would still carry under the other
	 *  conditions: what the filter can offer without leading to an empty shelf. */
	filterOptions: dbProcedure
		.input(
			shelfInput.extend({
				filter: bookFilterSchema,
				field: z.enum(FILTER_FIELDS),
			}),
		)
		.query(({ ctx, input }) =>
			filterOptions(ctx.db, input.shelfId, input.filter, input.field),
		),

	get: dbProcedure
		.input(bookInput)
		.query(({ ctx, input }) => findBook(ctx.db, input.shelfId, input.id)),

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
	 *  the shelf does not know yet. Progress goes out on `onScanProgress`. */
	scan: publicProcedure.input(shelfInput).mutation(async ({ ctx, input }) => {
		const shelf = await openShelf(ctx.db, ctx.config, input.shelfId);
		return scan(ctx.db, ctx.config, shelf);
	}),

	/** Stops the run that is going, if one is. The books already read are still
	 *  written; the ones not yet opened are left for the next scan. */
	stopScan: publicProcedure
		.input(shelfInput)
		.mutation(({ input }) => stopScan(input.shelfId)),

	/** How far the run on this shelf has got. */
	onScanProgress: publicProcedure
		.input(shelfInput)
		.subscription(async function* ({ input, signal }) {
			yield* onScanProgress(input.shelfId, signal);
		}),

	/** Reads these books again from their files, keeping what the reader added. */
	rescan: publicProcedure.input(booksInput).mutation(async ({ ctx, input }) => {
		const shelf = await openShelf(ctx.db, ctx.config, input.shelfId);
		return rescan(ctx.db, ctx.config, shelf, input.ids);
	}),

	/** One change, to one book or to a hundred, in a single transaction. */
	update: dbProcedure
		.input(booksInput.extend({ patch: bookPatchSchema }))
		.mutation(({ ctx, input }) =>
			update(ctx.db, input.shelfId, input.ids, input.patch),
		),

	/** Gives one of the shelf's names another spelling, taking every book that
	 *  carries it along. A name typed onto one the shelf already holds merges
	 *  the two. */
	renameFacet: dbProcedure
		.input(
			shelfInput.extend({
				kind: z.enum(FACET_KINDS),
				from: z.string(),
				to: z.string(),
			}),
		)
		.mutation(({ ctx, input }) =>
			renameFacet(ctx.db, input.shelfId, input.kind, input.from, input.to),
		),

	setPosition: dbProcedure
		.input(bookInput.extend({ position: positionSchema }))
		.mutation(({ ctx, input }) =>
			setPosition(ctx.db, input.shelfId, input.id, input.position),
		),

	markOpened: dbProcedure
		.input(bookInput)
		.mutation(({ ctx, input }) => markOpened(ctx.db, input.shelfId, input.id)),

	/** Forgets where these books were read to and when they were last opened. */
	clearPosition: dbProcedure
		.input(booksInput)
		.mutation(({ ctx, input }) =>
			clearPosition(ctx.db, input.shelfId, input.ids),
		),

	/** Drops everything the shelf remembers about these books, thumbnails and
	 *  all. The book files themselves are never touched; a thumbnail that will
	 *  not go is not an error. */
	remove: dbProcedure.input(booksInput).mutation(async ({ ctx, input }) => {
		await removeBooks(ctx.db, input.shelfId, input.ids);
		await removeCovers(ctx.config, input.ids);
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
