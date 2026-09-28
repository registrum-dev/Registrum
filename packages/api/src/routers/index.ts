import { router } from "../index";
import { aiRouter } from "./ai";
import { bookRouter } from "./book";
import { bookmarkRouter } from "./bookmark";
import { ruleRouter } from "./rule";
import { shelfRouter } from "./shelf";

export const appRouter = router({
	shelf: shelfRouter,
	book: bookRouter,
	bookmark: bookmarkRouter,
	rule: ruleRouter,
	ai: aiRouter,
});
export type AppRouter = typeof appRouter;
