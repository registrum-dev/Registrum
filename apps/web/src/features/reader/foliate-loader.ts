// Loading foliate-js at run time from public/.

import type { CfiModule, FoliateModule } from "@/features/reader/foliate";

// Served from `public/` and loaded by URL at run time.
const ENTRY = "/foliate-js/view.js";
const CFI = "/foliate-js/epubcfi.js";

let modulePromise: Promise<FoliateModule> | null = null;
let cfiPromise: Promise<CfiModule> | null = null;

/** Assembled at run time: Vite sees through a `const`, and a literal would be
 *  rewritten into a module request the dev server refuses to serve. */
function importPublic<T>(path: string): Promise<T> {
	const entry = new URL(path, window.location.origin).href;
	return import(/* @vite-ignore */ entry) as Promise<T>;
}

export function loadFoliate(): Promise<FoliateModule> {
	modulePromise ??= importPublic<FoliateModule>(ENTRY);
	return modulePromise;
}

/** The same module `view.js` imports, so it is fetched once. */
export function loadCfi(): Promise<CfiModule> {
	cfiPromise ??= importPublic<CfiModule>(CFI);
	return cfiPromise;
}
