import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "@registrum/api/routers/index";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { createAuth } from "./auth";
import { createContext } from "./context";
import { ENV } from "./env.server";
import { serveBookFile, serveComicPage, serveCover } from "./files";
import { prepare } from "./services";

await prepare();

const app = new Hono();
const auth = createAuth(ENV.REGISTRUM_PASSWORD);

app.use(logger());
if (ENV.CORS_ORIGIN) {
	app.use(
		"/*",
		cors({
			origin: ENV.CORS_ORIGIN,
			allowMethods: ["GET", "POST", "OPTIONS"],
			credentials: true,
		}),
	);
}

app.get("/api/health", (c) => c.text("OK"));
app.get("/api/session", auth.session);
app.post("/api/login", auth.login);
app.post("/api/logout", auth.logout);

app.use("/api/*", auth.guard);
app.use("/trpc/*", auth.guard);

app.get("/api/covers/:id", serveCover);
app.get("/api/books/:id/file", serveBookFile);
app.get("/api/comics/:key/:page", serveComicPage);
// Anything else under /api is a mistake, not a page of the web app.
app.all("/api/*", (c) => c.json({ error: "notFound" }, 404));

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext,
	}),
);

// The built web app, with every other path answered by its index so a reload
// on `/read?id=...` lands on the app rather than on a 404.
if (ENV.WEB_DIST) {
	const root = ENV.WEB_DIST;
	app.use("/*", serveStatic({ root }));
	app.get("*", serveStatic({ root, path: "index.html" }));
} else {
	app.get("/", (c) => c.text("OK"));
}

export default {
	port: ENV.PORT,
	fetch: app.fetch,
	// A scan or a generation can keep one request open for minutes.
	idleTimeout: 0,
};
