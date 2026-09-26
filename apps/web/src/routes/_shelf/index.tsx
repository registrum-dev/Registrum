// The shelf.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_shelf/")({ component: ShelfIndex });

/** The shelf is drawn by the layout, which keeps it under the book and the reader. */
function ShelfIndex() {
	return null;
}
