// The generations, end to end: read the book, ask, check the answer, and write
// down what is kept.

import type { Database } from "@registrum/db";
import { z } from "zod";

import type { PathsConfig } from "../context";
import { Failure, failingAs } from "../failure";
import { findBook } from "../library/book";
import {
	type Character,
	type Relation,
	savedAiOf,
	setCharacters,
	setRelations,
} from "../library/character";
import { bookFile } from "../library/files";
import type { BookRecord } from "../library/record";
import type { RuleTarget } from "../library/rule";
import { type BookText, readText } from "../parse/text";
import { firstChars } from "../util/text";
import { type Chapters, group, pick, readSoFar, spineIndex } from "./chapters";
import { askForShape, askForText, type Generated } from "./client";
import { announce, stoppable } from "./generations";
import { MAX_QUESTION } from "./limits";
import { draftRule, type PatternDraft, type PatternExample } from "./pattern";
import {
	askPrompt,
	charactersPrompt,
	type Locale,
	relationsPrompt,
	SPEAKERS,
	synopsisPrompt,
} from "./prompt";
import * as sanitize from "./sanitize";
import { characterListSchema, relationListSchema } from "./schema";
import { type Connection, isAiConfigured } from "./settings";

/** How many exchanges go back with a question. The chapters are the bulk of the
 *  call, so what was said before it is cheap -- an afternoon of it is not. */
const HISTORY_TURNS = 4;

export const askedSchema = z.object({
	/** The spine items the picked chapters cover. */
	sections: z.array(z.number().int()),
	question: z.string(),
	history: z.array(z.object({ speaker: z.enum(SPEAKERS), text: z.string() })),
});
/** One question: what to send with it, and what was said before it. */
export type Asked = z.infer<typeof askedSchema>;

/** One generation, and everything it was given. */
export interface Generation {
	db: Database;
	config: PathsConfig;
	ai: Connection;
	shelfId: string;
	id: string;
	locale: Locale;
	runId: string;
}

function connection(ai: Connection): Connection {
	if (!isAiConfigured(ai)) throw Failure.bare("aiNotConfigured");
	return ai;
}

/** The book, and its own words. Nothing is kept between calls: an EPUB is read
 *  again every time it is asked about. */
async function readBookText(
	at: Pick<Generation, "db" | "config" | "shelfId" | "id">,
): Promise<{
	book: BookRecord;
	text: BookText;
}> {
	const book = await findBook(at.db, at.shelfId, at.id);
	if (!book) throw Failure.bare("noBook");
	if (book.format !== "epub") throw Failure.bare("noBookText");
	const file = await bookFile(at.db, at.config, at.id);
	const text = await readText(file.path);
	if (text.chars === 0) throw Failure.bare("noBookText");
	return { book, text };
}

/** A draft synopsis. Nothing is written down: the reader keeps it, or does not. */
export function generateSynopsis(at: Generation): Promise<Generated<string>> {
	return stoppable(at.runId, async (controller) => {
		const endpoint = connection(at.ai);
		const { book, text } = await readBookText(at);
		const sent = announce(at.runId, text.chars);
		const answered = await askForText(
			endpoint,
			synopsisPrompt(book, text, at.locale),
			controller,
		);
		if (answered.value === "") throw Failure.bare("aiEmpty");
		return { value: answered.value, usage: answered.usage, sent };
	});
}

/** The book's characters, written down and kept. */
export function generateCharacters(
	at: Generation,
): Promise<Generated<Character[]>> {
	return stoppable(at.runId, async (controller) => {
		const endpoint = connection(at.ai);
		const { book, text } = await readBookText(at);
		const sent = announce(at.runId, text.chars);
		const answered = await askForShape(
			endpoint,
			charactersPrompt(book, text, at.locale),
			characterListSchema,
			controller,
		);
		const characters = sanitize.characters(answered.value.characters);
		if (characters.length === 0) throw Failure.bare("aiEmpty");
		// Writing the list drops the relations in the same transaction: a relation
		// names a person by the spelling the old list gave.
		await failingAs("db", () => setCharacters(at.db, at.id, characters));
		return { value: characters, usage: answered.usage, sent };
	});
}

/** The ties between the people already written down. */
export function generateRelations(
	at: Generation,
): Promise<Generated<Relation[]>> {
	return stoppable(at.runId, async (controller) => {
		const endpoint = connection(at.ai);
		// Read from the library, and read first: a book with nobody in it is
		// refused before its archive is opened.
		const characters = (await savedAiOf(at.db, at.id)).characters ?? [];
		if (characters.length === 0) throw Failure.bare("noCharacters");

		const { book, text } = await readBookText(at);
		const sent = announce(at.runId, text.chars);
		const answered = await askForShape(
			endpoint,
			relationsPrompt(book, text, characters, at.locale),
			relationListSchema,
			controller,
		);
		const relations = sanitize.relations(answered.value.relations, characters);
		await failingAs("db", () => setRelations(at.db, at.id, relations));
		return { value: relations, usage: answered.usage, sent };
	});
}

/** One answer about the chapters the reader picked. Nothing is written down:
 *  the exchange lives on the screen that asked for it. */
export function ask(at: Generation, asked: Asked): Promise<Generated<string>> {
	return stoppable(at.runId, async (controller) => {
		const question = firstChars(asked.question.trim(), MAX_QUESTION);
		if (question === "") throw Failure.bare("noQuestion");
		const endpoint = connection(at.ai);

		const { book, text } = await readBookText(at);
		const picked = pick(text, asked.sections);
		if (!picked) throw Failure.bare("noChapters");
		const sent = announce(at.runId, picked.chars);

		const history = asked.history.slice(-HISTORY_TURNS * 2);
		const answered = await askForText(
			endpoint,
			askPrompt(book, picked, history, question, at.locale),
			controller,
		);
		if (answered.value === "") throw Failure.bare("aiEmpty");
		return { value: answered.value, usage: answered.usage, sent };
	});
}

/** The chapters this book can be asked about, and the ones already behind the
 *  reader. Reads the book: there is nowhere the chapters are kept. */
export async function bookChapters(
	at: Pick<Generation, "db" | "config" | "shelfId" | "id">,
	here: number | null,
): Promise<Chapters> {
	const { book, text } = await readBookText(at);
	const grouped = group(text);
	// What the screen says beats what the record says: the reader panel knows
	// where the book is now, and the position is only written on the way out.
	const position =
		here ?? (book.position ? spineIndex(book.position.cfi) : null);
	return {
		chapters: grouped,
		defaultSections: position === null ? [] : readSoFar(grouped, position),
	};
}

/** A path rule written from the reader's examples. Reads no book: what goes is
 *  paths, and the values the reader typed. */
export function suggestRule(
	db: Database,
	ai: Connection,
	shelfId: string,
	target: RuleTarget,
	examples: readonly PatternExample[],
	locale: Locale,
	runId: string,
): Promise<Generated<PatternDraft>> {
	return stoppable(runId, async (controller) => {
		const endpoint = connection(ai);
		return draftRule(
			db,
			shelfId,
			target,
			examples,
			endpoint,
			locale,
			controller,
		);
	});
}
