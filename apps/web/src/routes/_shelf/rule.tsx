// Filling records in from where their files sit.

import { createFileRoute } from "@tanstack/react-router";

/** The layout draws the rule as a sheet over the shelf; the route only names it. */
export const Route = createFileRoute("/_shelf/rule")({ component: () => null });
