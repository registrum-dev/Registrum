// A book's details from Google Books: the model searches and picks, and what
// is offered is Google's own record of the volume it picked.

import type { Database } from "@registrum/db";
import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

import { Failure } from "../failure";
import { findBook } from "../library/book";
import {
	type FoundVolume,
	getVolume,
	searchVolumes,
} from "../lookup/google-books";
import { type Answered, askWithTools } from "./client";
import { stoppable } from "./generations";
import { type Locale, lookupPrompt } from "./prompt";
import { lookupAnswerSchema } from "./schema";
import { type Connection, isAiConfigured } from "./settings";

/** The most searches one book gets. The prompt says the same. */
const MAX_SEARCHES = 5;

/** The model's turns: one per search, and one to answer. */
const MAX_TURNS = MAX_SEARCHES + 1;

export interface Lookup {
	/** Null when the model found nothing it was sure of. */
	found: FoundVolume | null;
	/** The model's own sentence on why. */
	reason: string;
	searches: number;
}

export interface LookupRequest {
	db: Database;
	ai: Connection;
	googleBooksKey: string;
	shelfId: string;
	id: string;
	locale: Locale;
	runId: string;
}

/** Finds one book in Google Books. Nothing is written down: the reader picks
 *  what to keep. */
export function lookupBook(at: LookupRequest): Promise<Answered<Lookup>> {
	return stoppable(at.runId, async (controller) => {
		if (!isAiConfigured(at.ai)) throw Failure.bare("aiNotConfigured");
		const book = await findBook(at.db, at.shelfId, at.id);
		if (!book) throw Failure.bare("noBook");

		// Only an id a search handed back is taken: one the model made up would
		// fetch some other book, or none.
		const seen = new Set<string>();
		let searches = 0;
		const trouble: { failure: Failure | null } = { failure: null };

		const search = toolDefinition({
			name: "searchGoogleBooks",
			description:
				"Searches Google Books and returns up to 10 volumes. Each has an id, the title, authors, publisher, date, ISBN and the start of its description.",
			inputSchema: z.object({
				query: z.string().meta({
					description:
						"A Google Books query, e.g. isbn:9780000000000 or intitle:Sample inauthor:Example",
				}),
			}),
		}).server(async ({ query }) => {
			if (searches >= MAX_SEARCHES) {
				return { error: "No searches left. Answer with what you have." };
			}
			searches += 1;
			try {
				const results = await searchVolumes(
					query,
					at.googleBooksKey,
					controller.signal,
				);
				for (const result of results) seen.add(result.id);
				return { results };
			} catch (error) {
				if (error instanceof Failure && error.code === "aiStopped") throw error;
				const failure =
					error instanceof Failure ? error : new Failure("lookupCall", error);
				trouble.failure = failure;
				return { error: failure.detail || "The search failed." };
			}
		});

		const answered = await askWithTools(
			at.ai,
			lookupPrompt(book, at.locale),
			lookupAnswerSchema,
			[search],
			MAX_TURNS,
			controller,
		);
		const { volumeId, reason } = answered.value;

		if (volumeId === null || !seen.has(volumeId)) {
			// Nothing found because Google could not be asked is a failure, not an
			// answer.
			if (trouble.failure && seen.size === 0) throw trouble.failure;
			return {
				value: { found: null, reason: reason.trim(), searches },
				usage: answered.usage,
			};
		}
		const found = await getVolume(
			volumeId,
			at.googleBooksKey,
			controller.signal,
		);
		return {
			value: { found, reason: reason.trim(), searches },
			usage: answered.usage,
		};
	});
}
