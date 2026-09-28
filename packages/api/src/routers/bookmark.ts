import { z } from "zod";

import { dbProcedure, router } from "../index";
import {
	addBookmark,
	bookmarkSchema,
	listBookmarks,
	removeBookmark,
} from "../library/bookmark";
import { bookInput } from "./inputs";

export const bookmarkRouter = router({
	list: dbProcedure
		.input(bookInput)
		.query(({ ctx, input }) => listBookmarks(ctx.db, input.shelfId, input.id)),

	add: dbProcedure
		.input(bookInput.extend({ bookmark: bookmarkSchema }))
		.mutation(({ ctx, input }) =>
			addBookmark(ctx.db, input.shelfId, input.id, input.bookmark),
		),

	remove: dbProcedure
		.input(bookInput.extend({ bookmarkId: z.string() }))
		.mutation(({ ctx, input }) =>
			removeBookmark(ctx.db, input.shelfId, input.id, input.bookmarkId),
		),
});
