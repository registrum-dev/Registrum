// One book, in full.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/** The layout draws the book as a sheet over the shelf; the route only names it. */
export const Route = createFileRoute("/_shelf/book")({
	component: () => null,
	validateSearch: z.object({ id: z.string().optional().catch(undefined) }),
});
