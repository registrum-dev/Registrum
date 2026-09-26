// The router.

import { createRouter } from "@tanstack/react-router";

import { routeTree } from "@/routeTree.gen";

/**
 * The browser's own history: the back button leaves the reader, and a reload
 * on `/read?id=...` opens the same book again. The server answers every path
 * with the app.
 */
export const router = createRouter({
	routeTree,
	// Every screen over the shelf rises as a sheet and moves itself, so a
	// navigation plays no transition of its own: naming no types is how the
	// router is told to skip it. A browser that cannot name types (no
	// `:active-view-transition-type()`) still runs a plain view transition,
	// which `index.css` draws.
	defaultViewTransition: { types: () => false },
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
