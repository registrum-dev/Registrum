import type { Context } from "@Registrum/api/context";

import { config, db } from "./services";

/** What every tRPC call runs with: the same database and folders each time. */
export function createContext(): Context {
	return { db, config };
}
