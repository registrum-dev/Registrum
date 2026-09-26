import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";
import { Failure, type FailureShape } from "./failure";

export const t = initTRPC.context<Context>().create({
	// A failure the library reported crosses as its code, which the screen
	// turns into a sentence of its own (`error.<code>`).
	errorFormatter({ shape, error }) {
		const failure: FailureShape | null =
			error.cause instanceof Failure ? error.cause.toShape() : null;
		return { ...shape, data: { ...shape.data, failure } };
	},
});

export const router = t.router;

/** A failure the library knows is the caller's to hear about, not a fault in
 *  the server; anything else is logged here, where the detail can be read. */
const reporting = t.middleware(async ({ next, path }) => {
	const result = await next();
	if (result.ok) return result;
	const { cause } = result.error;
	if (cause instanceof Failure) {
		throw new TRPCError({ code: "BAD_REQUEST", message: cause.message, cause });
	}
	if (result.error.code === "INTERNAL_SERVER_ERROR")
		console.error(`${path}:`, cause ?? result.error);
	return result;
});

export const publicProcedure = t.procedure.use(reporting);

/** A procedure that only reads and writes the library: whatever fault it meets
 *  that is not already a failure is the database's (`failingAs("db")` around
 *  the whole of it). */
export const dbProcedure = publicProcedure.use(async ({ next }) => {
	const result = await next();
	if (result.ok || result.error.code !== "INTERNAL_SERVER_ERROR") return result;
	const { cause } = result.error;
	if (cause instanceof Failure) return result;
	const failure = new Failure("db", cause ?? result.error);
	throw new TRPCError({
		code: "INTERNAL_SERVER_ERROR",
		message: failure.message,
		cause: failure,
	});
});
