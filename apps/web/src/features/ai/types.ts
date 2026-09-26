// Whether a book can be asked about at all.

import type { Locale } from "@Registrum/api/types";
import type { Locale as Screen } from "@/i18n";
import type { Holds, SameWords } from "@/lib/ipc";

/** A generation is asked in the language the screen is already in, so the two
 *  lists are one list: a locale the catalogue gains and the server has not
 *  heard of fails the type check. */
export type LocaleContract = Holds<SameWords<Locale, Screen>>;

/** What a book carries, which the server assembles out of rows. It needs no
 *  schema on this side: the words a role can use are the server's. */
export type {
	AiSettings,
	Asked,
	BookAi,
	Chapter,
	Chapters,
	Character,
	CharacterRole,
	Generated,
	Graph,
	Locale,
	Relation,
	Speaker,
	Turn,
	Usage,
} from "@Registrum/api/types";

/** How much of the book went. */
export interface Sent {
	chars: number;
}

/** Whether an endpoint and a model have been named. The key may be empty -- a
 *  local Ollama wants none. */
export function isConfigured(settings: {
	baseUrl: string;
	model: string;
}): boolean {
	return settings.baseUrl.trim() !== "" && settings.model.trim() !== "";
}

/** Whether this book can be generated from at all. */
export function hasBookText(format: string): boolean {
	return format === "epub";
}
