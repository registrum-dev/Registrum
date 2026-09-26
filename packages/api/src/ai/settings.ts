// The endpoint every generation is asked on, as the server was told on start.
// The key never goes to a browser.

/** Which endpoint to ask, as which model. */
export interface Connection {
	baseUrl: string;
	apiKey: string;
	model: string;
}

/** What a browser is told: everything but the key, and whether there is one. */
export interface AiSettings {
	baseUrl: string;
	model: string;
	hasKey: boolean;
}

export function aiSettingsOf(connection: Connection): AiSettings {
	return {
		baseUrl: connection.baseUrl,
		model: connection.model,
		hasKey: connection.apiKey !== "",
	};
}

/** Whether an endpoint and a model have been named. The key may be empty -- a
 *  local Ollama wants none. */
export function isConfigured(connection: {
	baseUrl: string;
	model: string;
}): boolean {
	return connection.baseUrl.trim() !== "" && connection.model.trim() !== "";
}
