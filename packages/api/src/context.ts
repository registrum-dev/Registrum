import type { Database } from "@registrum/db";

import type { Connection } from "./ai/settings";

/** Where the library's files are, as the server was told on start. */
export interface PathsConfig {
	/** The folder the shelves' folders are mounted under. */
	booksDir: string;
	/** Where the database and the thumbnails are kept. */
	dataDir: string;
}

export type Context = {
	db: Database;
	config: PathsConfig;
	/** The AI endpoint, as the server was told on start. */
	ai: Connection;
};
