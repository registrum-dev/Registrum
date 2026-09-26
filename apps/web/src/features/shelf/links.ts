// Where a book can be gone to from the shelf, said once for every screen that
// goes there.

import { linkOptions } from "@tanstack/react-router";

/** The book's own screen. */
export function bookLink(id: string) {
	return linkOptions({ to: "/book", search: { id } });
}

/** The reader. `from: "book"` sends its back button to the book's screen. */
export function readLink(id: string | undefined, from?: "book") {
	return linkOptions({ to: "/read", search: { id, from } });
}
