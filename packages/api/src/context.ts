import type { Database } from "@Registrum/db";

import type { Connection } from "./ai/settings";

/** Where the library's files are, as the server was told on start. */
export interface LibraryConfig {
	/** The folder the shelves' folders are mounted under. */
	booksDir: string;
	/** Where the database and the thumbnails are kept. */
	dataDir: string;
}

export type Context = {
	db: Database;
	config: LibraryConfig;
	/** The AI endpoint, as the server was told on start. */
	ai: Connection;
};
