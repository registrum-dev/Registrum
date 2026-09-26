import type { LibraryConfig } from "@Registrum/api/context";
import { createPrismaClient, prepareDatabase } from "@Registrum/db";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { ENV } from "./env.server";

export const db = createPrismaClient(ENV);

/** The two folders, spelled absolute once so nothing downstream depends on the
 *  working directory. */
export const config: LibraryConfig = {
	booksDir: resolve(ENV.BOOKS_DIR),
	dataDir: resolve(ENV.DATA_DIR),
};

/** Makes the data folder, and puts the database in the mode the app reads it in.
 *  The covers folder is made by the first cover written into it. */
export async function prepare(): Promise<void> {
	await mkdir(config.dataDir, { recursive: true });
	await prepareDatabase(db);
}
