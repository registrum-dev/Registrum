// The call itself, through TanStack AI, to any endpoint that speaks OpenAI's
// Chat Completions.

import { type ChatMiddleware, chat, type ModelMessage } from "@tanstack/ai";
import { openaiCompatibleText } from "@tanstack/ai-openai/compatible";
import type { z } from "zod";

import { Failure } from "../failure";
import type { Prompt } from "./prompt";
import type { Connection } from "./settings";

/** Sent so OpenRouter can name the app in the reader's own list of calls.
 *  Every other endpoint ignores it. */
const TITLE = "Registrum";

/** What one call cost, as the endpoint reported it. No money: the endpoint's
 *  `usage` does not carry any. */
export interface Usage {
	promptTokens: number | null;
	completionTokens: number | null;
	/** The model that was asked. */
	model: string | null;
}

/** What one call answers with, whatever shape was asked for. */
export interface Answered<T> {
	value: T;
	usage: Usage;
}

/** One finished generation: what was asked for, what it cost, and what went. */
export interface Generated<T> extends Answered<T> {
	/** How much of the book went. */
	sent: { chars: number };
}

/** The adapter for the reader's endpoint. A local Ollama wants no key, but the
 *  OpenAI client will not be built without one. */
function adapter(connection: Connection) {
	return openaiCompatibleText(connection.model.trim(), {
		name: "registrum",
		api: "chat-completions",
		baseURL: connection.baseUrl.trim().replace(/\/+$/, ""),
		apiKey: connection.apiKey.trim() || "none",
		defaultHeaders: { "X-Title": TITLE },
		maxRetries: 0,
	});
}

/** What was said before the question, then the question. */
function messagesOf(prompt: Prompt): ModelMessage[] {
	return [
		...prompt.history.map(
			(said): ModelMessage => ({
				role: said.kind === "asked" ? "user" : "assistant",
				content: said.text,
			}),
		),
		{ role: "user", content: prompt.user },
	];
}

/** Adds up the usage the endpoint reports, once per model turn. */
function counting(connection: Connection): {
	usage: Usage;
	middleware: ChatMiddleware;
} {
	const usage: Usage = {
		promptTokens: null,
		completionTokens: null,
		model: connection.model.trim(),
	};
	return {
		usage,
		middleware: {
			name: "usage",
			onUsage: (_ctx, reported) => {
				usage.promptTokens = (usage.promptTokens ?? 0) + reported.promptTokens;
				usage.completionTokens =
					(usage.completionTokens ?? 0) + reported.completionTokens;
			},
		},
	};
}

/** Whatever the call threw, as a failure the screen has words for. An answer
 *  that does not fit the shape is its own kind of failure: the endpoint
 *  answered, and what it said was not usable. */
function failed(error: unknown, signal: AbortSignal): Failure {
	if (error instanceof Failure) return error;
	if (signal.aborted) return Failure.bare("aiStopped");
	const name = error instanceof Error ? error.name : "";
	const message = error instanceof Error ? error.message : String(error);
	if (
		name === "StandardSchemaValidationError" ||
		name === "SyntaxError" ||
		/structured output/i.test(message)
	) {
		return new Failure("aiUnreadable", message);
	}
	return new Failure("aiCall", error);
}

/** One call: the options every call shares, `ask` with them, and whatever it
 *  throws turned into a failure. `controller` is the run's own, which the
 *  button stops. */
async function call<T>(
	connection: Connection,
	prompt: Prompt,
	controller: AbortController,
	ask: (common: {
		adapter: ReturnType<typeof adapter>;
		systemPrompts: string[];
		messages: ModelMessage[];
		abortController: AbortController;
		middleware: ChatMiddleware[];
	}) => Promise<T>,
): Promise<Answered<T>> {
	const { usage, middleware } = counting(connection);
	try {
		const value = await ask({
			adapter: adapter(connection),
			systemPrompts: [prompt.system],
			messages: messagesOf(prompt),
			abortController: controller,
			middleware: [middleware],
		});
		return { value, usage };
	} catch (error) {
		throw failed(error, controller.signal);
	}
}

/** One call, answering with prose. */
export async function askForText(
	connection: Connection,
	prompt: Prompt,
	controller: AbortController,
): Promise<Answered<string>> {
	const answered = await call(connection, prompt, controller, (common) =>
		chat({ ...common, stream: false }),
	);
	return { ...answered, value: answered.value.trim() };
}

/** One call, answering in the shape of a schema. The schema's descriptions
 *  are sent: they are instructions to the model. */
export function askForShape<T>(
	connection: Connection,
	prompt: Prompt,
	schema: z.ZodType<T>,
	controller: AbortController,
): Promise<Answered<T>> {
	return call(
		connection,
		prompt,
		controller,
		async (common) => (await chat({ ...common, outputSchema: schema })) as T,
	);
}
