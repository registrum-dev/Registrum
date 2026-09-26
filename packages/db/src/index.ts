import { PrismaLibSql } from "@prisma/adapter-libsql";

import { type Prisma, PrismaClient } from "../prisma/generated/client";
import type { DatabaseConfig } from "./config";

export function createPrismaClient(env: DatabaseConfig) {
	const adapter = new PrismaLibSql({
		url: env.DATABASE_URL,
	});

	return new PrismaClient({ adapter });
}

export type Database = ReturnType<typeof createPrismaClient>;

/** What a statement runs on inside `transaction`. */
export type Transaction = Prisma.TransactionClient;

/** What a query can run on: the client itself, or a transaction. */
export type Client = Database | Transaction;

export type { Prisma };

/**
 * One transaction. The waits are long because a scan writes in batches while
 * the shelf is being edited, and the driver runs one transaction at a time.
 */
export function transaction<T>(
	db: Database,
	work: (tx: Transaction) => Promise<T>,
): Promise<T> {
	return db.$transaction(work, { maxWait: 120_000, timeout: 300_000 });
}

/**
 * The mode the app reads the database in. WAL lets the shelf be read while a
 * scan is writing, and is kept in the file itself. `synchronous` is not: it
 * holds only for the connection this runs on. Prisma has no API for a pragma,
 * so these are the statements the app writes by hand.
 */
export async function prepareDatabase(db: Database): Promise<void> {
	await db.$queryRaw`PRAGMA journal_mode = WAL`;
	await db.$queryRaw`PRAGMA synchronous = NORMAL`;
}
