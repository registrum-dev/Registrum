import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { Connection } from "@registrum/api/ai/settings";
import type { PathsConfig } from "@registrum/api/context";
import { createPrismaClient, prepareDatabase } from "@registrum/db";

import { ENV } from "./env.server";

export const db = createPrismaClient(ENV);

/** The two folders, spelled absolute once so nothing downstream depends on the
 *  working directory. */
export const config: PathsConfig = {
	booksDir: resolve(ENV.BOOKS_DIR),
	dataDir: resolve(ENV.DATA_DIR),
};

/** The AI endpoint. Left unset, generations say so rather than being offered. */
export const ai: Connection = {
	baseUrl: ENV.AI_BASE_URL ?? "",
	apiKey: ENV.AI_API_KEY ?? "",
	model: ENV.AI_MODEL ?? "",
};

/** Google Books is asked without a key unless one is given. */
export const googleBooksKey = ENV.GOOGLE_BOOKS_API_KEY ?? "";

/** Makes the data folder, and puts the database in the mode the app reads it in.
 *  The covers folder is made by the first cover written into it. */
export async function prepare(): Promise<void> {
	await mkdir(config.dataDir, { recursive: true });
	await prepareDatabase(db);
}
