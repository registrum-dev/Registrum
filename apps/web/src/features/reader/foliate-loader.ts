// Loading foliate-js at run time from public/.

import type { FoliateModule } from "@/features/reader/foliate";

// Served from `public/` and loaded by URL at run time.
const ENTRY = "/foliate-js/view.js";

let modulePromise: Promise<FoliateModule> | null = null;

export function loadFoliate(): Promise<FoliateModule> {
	if (!modulePromise) {
		// Assembled at run time: Vite sees through a `const`, and a literal would be
		// rewritten into a module request the dev server refuses to serve.
		const entry = new URL(ENTRY, window.location.origin).href;
		modulePromise = import(/* @vite-ignore */ entry) as Promise<FoliateModule>;
	}
	return modulePromise;
}
