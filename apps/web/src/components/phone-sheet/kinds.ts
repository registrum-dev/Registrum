// The six shapes a sheet takes.

/**
 * `page` nearly fills the window and steps back what is under it. `detent`
 * opens at half height and pulls up to a page. `half` stays at half height.
 * `fit` is as tall as what it
 * holds. `peek` is low and throws no shade, so what it changes shows behind
 * it. `drawer` comes from the left.
 */
export type SheetKind = "page" | "detent" | "half" | "fit" | "peek" | "drawer";

/** How dark each shape's scrim gets. */
export const SCRIM: Record<SheetKind, number> = {
	page: 0.4,
	detent: 0.3,
	half: 0.3,
	fit: 0.35,
	peek: 0,
	drawer: 0.35,
};

/**
 * Where on the sheet's own timeline it lifts its scrim, and where it steps
 * back what is under it. `entry` runs from the sheet's top edge at the foot of
 * the window to its foot there too; a drawer's `exit` runs the other way.
 * `detent`'s 55% is its half height, the same share as its snap mark.
 */
export const RANGE: Record<SheetKind, { lift: string; push: string | null }> = {
	page: { lift: "entry 0% entry 100%", push: "entry 0% entry 100%" },
	detent: { lift: "entry 0% entry 55%", push: "entry 55% entry 100%" },
	half: { lift: "entry 0% entry 100%", push: null },
	fit: { lift: "entry 0% entry 100%", push: null },
	peek: { lift: "entry 0% entry 100%", push: null },
	drawer: { lift: "exit 0% exit 100%", push: null },
};

const SHADOW_UP = "shadow-[0_-2px_30px_rgb(0_0_0/0.18)]";

/** On a wide window a sheet stops at these and stands in the middle. */
const PAGE_WIDTH = "mx-auto w-full max-w-[45rem]";
const MENU_WIDTH = "mx-auto w-full max-w-[36rem]";

export const SHAPE: Record<SheetKind, string> = {
	page: `h-[calc(100%-var(--safe-top)-0.625rem)] rounded-t-2xl bg-background ${PAGE_WIDTH} ${SHADOW_UP}`,
	detent: `h-[calc(100%-var(--safe-top)-0.625rem)] rounded-t-2xl bg-background ${PAGE_WIDTH} ${SHADOW_UP}`,
	half: `h-[55dvh] rounded-t-2xl bg-background pb-[var(--safe-bottom)] ${PAGE_WIDTH} ${SHADOW_UP}`,
	fit: `max-h-[86dvh] rounded-t-[1.125rem] bg-card pb-[var(--safe-bottom)] has-[>[data-sheet-dock]]:pb-0 ${MENU_WIDTH} ${SHADOW_UP}`,
	peek: `h-[min(52dvh,30rem)] rounded-t-[1.125rem] bg-card/95 pb-[var(--safe-bottom)] backdrop-blur-xl ${MENU_WIDTH} ${SHADOW_UP}`,
	drawer:
		"h-full w-[min(82vw,19.5rem)] shrink-0 rounded-r-[1.125rem] bg-sidebar pt-[var(--safe-top)] pb-[var(--safe-bottom)] pl-[var(--safe-left)] shadow-[4px_0_30px_rgb(0_0_0/0.2)]",
};
