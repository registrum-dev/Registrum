// The generations, end to end: read the book, ask, check the answer, and write
// down what is kept.

import type { Database } from "@Registrum/db";
import { z } from "zod";

import type { LibraryConfig } from "../context";
import { Failure, failingAs } from "../failure";
import { firstChars } from "../lib/text";
import { findOne } from "../library/book";
import {
	aiOf,
	type Character,
	type Graph,
	setCharacters,
	setGraph,
} from "../library/character";
import { bookFile } from "../library/files";
import type { BookRecord } from "../library/record";
import type { RuleTarget } from "../library/rule";
import { type BookText, readText } from "../parse/text";
import { type Chapters, group, pick, readSoFar, spineIndex } from "./chapters";
import { askForShape, askForText, type Generated } from "./client";
import { MAX_QUESTION } from "./limits";
import {
	type PatternDraft,
	type PatternExample,
	suggestRule as suggest,
} from "./pattern";
import {
	askPrompt,
	charactersPrompt,
	graphPrompt,
	type Locale,
	SPEAKERS,
	synopsisPrompt,
} from "./prompt";
import { announce, stoppable } from "./runs";
import { characterList, relationList } from "./schema";
import { type Connection, isConfigured } from "./settings";
import * as tidy from "./tidy";

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
	config: LibraryConfig;
	ai: Connection;
	shelfId: string;
	id: string;
	locale: Locale;
	run: string;
}

function connection(ai: Connection): Connection {
	if (!isConfigured(ai)) throw Failure.bare("aiUnset");
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
	const book = await findOne(at.db, at.shelfId, at.id);
	if (!book) throw Failure.bare("noBook");
	if (book.format !== "epub") throw Failure.bare("noBookText");
	const file = await bookFile(at.db, at.config, at.id);
	const text = await readText(file.path);
	if (text.chars === 0) throw Failure.bare("noBookText");
	return { book, text };
}

/** A draft synopsis. Nothing is written down: the reader keeps it, or does not. */
export function synopsis(at: Generation): Promise<Generated<string>> {
	return stoppable(at.run, async (controller) => {
		const endpoint = connection(at.ai);
		const { book, text } = await readBookText(at);
		const sent = announce(at.run, text.chars);
		const answered = await askForText(
			endpoint,
			synopsisPrompt(book, text, at.locale),
			controller,
		);
		if (answered.value === "") throw Failure.bare("aiEmpty");
		return { value: answered.value, usage: answered.usage, sent };
	});
}

/** The book's cast, written down and kept. */
export function characters(at: Generation): Promise<Generated<Character[]>> {
	return stoppable(at.run, async (controller) => {
		const endpoint = connection(at.ai);
		const { book, text } = await readBookText(at);
		const sent = announce(at.run, text.chars);
		const answered = await askForShape(
			endpoint,
			charactersPrompt(book, text, at.locale),
			characterList,
			controller,
		);
		const cast = tidy.characters(answered.value.characters);
		if (cast.length === 0) throw Failure.bare("aiEmpty");
		// Writing the list drops the map in the same transaction: a relation names
		// a person by the spelling the old list gave.
		await failingAs("db", () => setCharacters(at.db, at.id, cast));
		return { value: cast, usage: answered.usage, sent };
	});
}

/** The ties between the people already written down. */
export function graph(at: Generation): Promise<Generated<Graph>> {
	return stoppable(at.run, async (controller) => {
		const endpoint = connection(at.ai);
		// Read from the library, and read first: a book with nobody in it is
		// refused before its archive is opened.
		const cast = (await aiOf(at.db, at.id)).characters ?? [];
		if (cast.length === 0) throw Failure.bare("noCast");

		const { book, text } = await readBookText(at);
		const sent = announce(at.run, text.chars);
		const answered = await askForShape(
			endpoint,
			graphPrompt(book, text, cast, at.locale),
			relationList,
			controller,
		);
		const drawn = { relations: tidy.relations(answered.value.relations, cast) };
		await failingAs("db", () => setGraph(at.db, at.id, drawn));
		return { value: drawn, usage: answered.usage, sent };
	});
}

/** One answer about the chapters the reader picked. Nothing is written down:
 *  the exchange lives on the screen that asked for it. */
export function ask(at: Generation, asked: Asked): Promise<Generated<string>> {
	return stoppable(at.run, async (controller) => {
		const question = firstChars(asked.question.trim(), MAX_QUESTION);
		if (question === "") throw Failure.bare("noQuestion");
		const endpoint = connection(at.ai);

		const { book, text } = await readBookText(at);
		const picked = pick(text, asked.sections);
		if (!picked) throw Failure.bare("noChapters");
		const sent = announce(at.run, picked.chars);

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
		here ?? (book.progress ? spineIndex(book.progress.cfi) : null);
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
	run: string,
): Promise<Generated<PatternDraft>> {
	return stoppable(run, async (controller) => {
		const endpoint = connection(ai);
		return suggest(db, shelfId, target, examples, endpoint, locale, controller);
	});
}
