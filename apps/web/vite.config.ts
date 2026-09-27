import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { varlockVitePlugin } from "@varlock/vite-integration";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { pdfjs } from "./vite-plugin-pdfjs";

/** Where the API server listens in development; the built app is served by it.
 *  Read from the environment varlock loads (`.env.schema`). */
const API = process.env.VITE_SERVER_URL || "http://localhost:3000";

export default defineConfig({
	server: {
		port: 3001,
		// The page and the API share an origin, as they do when the server hands
		// out the built app, so the sign-in cookie needs nothing else.
		proxy: {
			"/trpc": { target: API, changeOrigin: false },
			"/api": { target: API, changeOrigin: false },
		},
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [
		varlockVitePlugin({ ssrInjectMode: "auto-load" }),
		tailwindcss(),
		// Before the React plugin: it writes `src/routeTree.gen.ts` from the
		// files in `src/routes/`, and React's plugin has to see the result.
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
		}),
		react(),
		pdfjs(),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["favicon.svg", "apple-touch-icon.png"],
			manifest: {
				name: "Registrum",
				short_name: "Registrum",
				start_url: "/",
				display: "standalone",
				background_color: "#edf0f4",
				theme_color: "#edf0f4",
				icons: [
					{ src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
					{ src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
					{
						src: "maskable-icon-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			workbox: {
				// The reader has to open offline, PDFs included, so foliate-js and
				// pdf.js are kept whole rather than as they are first asked for.
				globPatterns: [
					"**/*.{js,mjs,css,html,svg,png,woff2}",
					"foliate-js/vendor/pdfjs/{cmaps,standard_fonts}/*",
				],
				maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
				navigateFallback: "/index.html",
				navigateFallbackDenylist: [/^\/api\//, /^\/trpc\//],
				runtimeCaching: [
					{
						// A cover's URL changes with its scan, so what is kept is never stale.
						urlPattern: ({ url }) => url.pathname.startsWith("/api/covers/"),
						handler: "CacheFirst",
						options: {
							cacheName: "covers",
							cacheableResponse: { statuses: [200] },
							expiration: { maxEntries: 2000 },
						},
					},
				],
			},
		}),
	],
});
