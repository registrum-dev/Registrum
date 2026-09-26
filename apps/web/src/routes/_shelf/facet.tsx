// One of the shelf's facets.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { FACET_KINDS } from "@/features/shelf/types";

/** A word that is there, or nothing. */
const filled = z.string().min(1).optional().catch(undefined);

/** The layout draws the name as a sheet over the shelf; the route only names it. */
export const Route = createFileRoute("/_shelf/facet")({
	component: () => null,
	validateSearch: z.object({
		kind: z.enum(FACET_KINDS).optional().catch(undefined),
		value: filled,
		/** Opened from this book's sheet, which waits underneath and is where closing goes. */
		from: filled,
	}),
});
