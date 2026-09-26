import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { varlockVitePlugin } from "@varlock/vite-integration";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
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
	],
});
