// One of the library's names.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { NAME_KINDS } from "@/features/library/types";

/** A word that is there, or nothing. */
const filled = z.string().min(1).optional().catch(undefined);

/** The layout draws the name as a sheet over the shelf; the route only names it. */
export const Route = createFileRoute("/_shelf/name")({
	component: () => null,
	validateSearch: z.object({
		kind: z.enum(NAME_KINDS).optional().catch(undefined),
		name: filled,
		/** Opened from this book's sheet, which waits underneath and is where closing goes. */
		from: filled,
	}),
});
