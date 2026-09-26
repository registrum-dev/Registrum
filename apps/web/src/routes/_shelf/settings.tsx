// The app's own settings.

import { createFileRoute } from "@tanstack/react-router";

/** The layout draws the settings as a sheet over the shelf; the route only names them. */
export const Route = createFileRoute("/_shelf/settings")({
	component: () => null,
});
