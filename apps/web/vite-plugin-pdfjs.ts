// Puts pdf.js where foliate-js expects it, from the `pdfjs-dist` package.
//
// foliate-js's `pdf.js` imports `./vendor/pdfjs/pdf.mjs` and points pdf.js at the
// worker, CMaps and standard fonts next to it. Upstream commits those files; here
// they come from node_modules instead: served as-is in development, copied into
// the build. The two layer stylesheets are not in the package and stay in
// `public/foliate-js/vendor/pdfjs/`.

import { createReadStream } from "node:fs";
import { cp, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import type { Plugin } from "vite";

/** Where foliate-js looks, under the site root. */
const BASE = "/foliate-js/vendor/pdfjs/";

const PACKAGE = path.dirname(
	createRequire(import.meta.url).resolve("pdfjs-dist/package.json"),
);

/** Published path under BASE → path inside the package. */
const FILES: Record<string, string> = {
	"pdf.mjs": "build/pdf.mjs",
	"pdf.worker.mjs": "build/pdf.worker.mjs",
	"cmaps/": "cmaps/",
	"standard_fonts/": "standard_fonts/",
};

/** The package file for a request path under BASE, or null if it is not ours. */
function resolve(rel: string): string | null {
	for (const [from, to] of Object.entries(FILES)) {
		if (rel === from) return path.join(PACKAGE, to);
		if (!from.endsWith("/") || !rel.startsWith(from)) continue;
		const dir = path.join(PACKAGE, to);
		const file = path.join(dir, rel.slice(from.length));
		// No climbing out of the directory with `..`.
		return file.startsWith(dir) ? file : null;
	}
	return null;
}

export function pdfjs(): Plugin {
	let outDir = "";
	return {
		name: "registrum:pdfjs",
		configResolved(config) {
			// Vite also closes the bundle when the dev server stops.
			if (config.command === "build") {
				outDir = path.resolve(config.root, config.build.outDir);
			}
		},
		configureServer(server) {
			server.middlewares.use(BASE, async (req, res, next) => {
				const rel = decodeURIComponent((req.url ?? "").split("?")[0]).slice(1);
				const file = resolve(rel);
				if (!file || !(await stat(file).catch(() => null))?.isFile()) {
					return next();
				}
				res.setHeader(
					"Content-Type",
					file.endsWith(".mjs")
						? "text/javascript"
						: "application/octet-stream",
				);
				createReadStream(file).pipe(res);
			});
		},
		async closeBundle() {
			if (!outDir) return;
			const dest = path.join(outDir, BASE);
			for (const [from, to] of Object.entries(FILES)) {
				await cp(path.join(PACKAGE, to), path.join(dest, from), {
					recursive: true,
				});
			}
		},
	};
}
