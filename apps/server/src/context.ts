import type { Context } from "@registrum/api/context";

import { ai, config, db } from "./services";

/** What every tRPC call runs with: the same database, folders and endpoint each time. */
export function createContext(): Context {
	return { db, config, ai };
}
