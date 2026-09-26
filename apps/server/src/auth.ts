// The one password browsers sign in with, when one is set. Sessions live in
// memory: a restart signs every browser out.

import { randomBytes, timingSafeEqual } from "node:crypto";

import type { Context, Next } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

const COOKIE = "registrum";
/** How long a wrong password holds up the next attempt. */
const WRONG_PASSWORD_DELAY_MS = 1000;

const sessions = new Set<string>();
/** One attempt at a time, so a wrong password slows every guess down. */
let turn: Promise<void> = Promise.resolve();

function same(a: string, b: string): boolean {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	return left.length === right.length && timingSafeEqual(left, right);
}

export function createAuth(password: string | undefined) {
	const required = Boolean(password);

	const signedIn = (c: Context) => {
		if (!required) return true;
		const token = getCookie(c, COOKIE);
		return token !== undefined && sessions.has(token);
	};

	return {
		/** Whether a password is needed, and whether this browser has given it. */
		session: (c: Context) => c.json({ required, signedIn: signedIn(c) }),

		async login(c: Context) {
			if (!required || !password) return c.body(null, 204);
			const body = await c.req
				.json<{ password?: unknown }>()
				.catch(() => ({}) as { password?: unknown });
			const given = typeof body.password === "string" ? body.password : "";

			const previous = turn;
			let release = () => {};
			turn = new Promise((resolve) => {
				release = resolve;
			});
			await previous;
			try {
				if (!same(given, password)) {
					await new Promise((resolve) =>
						setTimeout(resolve, WRONG_PASSWORD_DELAY_MS),
					);
					return c.body(null, 401);
				}
			} finally {
				release();
			}
			const token = randomBytes(32).toString("base64url");
			sessions.add(token);
			setCookie(c, COOKIE, token, {
				path: "/",
				httpOnly: true,
				sameSite: "Strict",
			});
			return c.body(null, 204);
		},

		logout(c: Context) {
			const token = getCookie(c, COOKIE);
			if (token) sessions.delete(token);
			deleteCookie(c, COOKIE, { path: "/" });
			return c.body(null, 204);
		},

		/** Lets a request through only from a browser that has signed in. */
		async guard(c: Context, next: Next) {
			if (!signedIn(c)) return c.json({ error: "unauthorized" }, 401);
			await next();
		},
	};
}
