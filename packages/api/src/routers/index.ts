import { router } from "../index";
import { aiRouter } from "./ai";
import { libraryRouter } from "./library";
import { ruleRouter } from "./rule";
import { shelfRouter } from "./shelf";

export const appRouter = router({
	shelf: shelfRouter,
	library: libraryRouter,
	rule: ruleRouter,
	ai: aiRouter,
});
export type AppRouter = typeof appRouter;
