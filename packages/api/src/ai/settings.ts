// The endpoint every generation is asked on, kept on the server: the key never
// goes back to a browser once it has been typed.

import type { Database } from "@Registrum/db";
import { z } from "zod";

import { failingAs } from "../failure";

const KEY = "ai";

const storedSchema = z.object({
	baseUrl: z.string().catch(""),
	apiKey: z.string().catch(""),
	model: z.string().catch(""),
});

/** Which endpoint to ask, as which model. */
export type Connection = z.infer<typeof storedSchema>;

/** What a browser is told: everything but the key, and whether there is one. */
export interface AiSettings {
	baseUrl: string;
	model: string;
	hasKey: boolean;
}

export const aiSettingsPatchSchema = z.object({
	baseUrl: z.string().optional(),
	model: z.string().optional(),
	/** A new key; the empty string takes the key away. */
	apiKey: z.string().optional(),
});

export async function readConnection(db: Database): Promise<Connection> {
	const row = await failingAs("db", () =>
		db.setting.findUnique({ where: { key: KEY } }),
	);
	let stored: unknown = {};
	try {
		stored = row ? JSON.parse(row.value) : {};
	} catch {
		// A value nobody can read is no value.
	}
	return storedSchema.parse(
		typeof stored === "object" && stored !== null ? stored : {},
	);
}

export async function readAiSettings(db: Database): Promise<AiSettings> {
	const connection = await readConnection(db);
	return {
		baseUrl: connection.baseUrl,
		model: connection.model,
		hasKey: connection.apiKey !== "",
	};
}

export async function writeAiSettings(
	db: Database,
	patch: z.infer<typeof aiSettingsPatchSchema>,
): Promise<AiSettings> {
	const next = { ...(await readConnection(db)), ...patch };
	const value = JSON.stringify(next);
	await failingAs("db", () =>
		db.setting.upsert({
			where: { key: KEY },
			create: { key: KEY, value },
			update: { value },
		}),
	);
	return readAiSettings(db);
}

/** Whether an endpoint and a model have been named. The key may be empty -- a
 *  local Ollama wants none. */
export function isConfigured(connection: {
	baseUrl: string;
	model: string;
}): boolean {
	return connection.baseUrl.trim() !== "" && connection.model.trim() !== "";
}
