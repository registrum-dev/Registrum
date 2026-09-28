// Every name the shelf files books under.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { FACET_KINDS } from "@/features/shelf/types";

/** The layout draws the list as a sheet over the shelf; the route only names the kind. */
export const Route = createFileRoute("/_shelf/names")({
	component: () => null,
	validateSearch: z.object({
		kind: z.enum(FACET_KINDS).optional().catch(undefined),
	}),
});
