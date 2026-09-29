// Trimming, clipping and de-duplicating an answer.

import type { Character, Relation } from "../library/character";
import { clip } from "../util/text";
import type { CharacterAnswer, RelationAnswer } from "./schema";

/** The most people a map can hold and still be read. The prompt asks for the
 *  same number. */
const MAX_CHARACTERS = 24;
/** The most lines. Twenty-four people stand in far more relations than that,
 *  but not legibly. */
const MAX_RELATIONS = 80;

const MAX_NAME = 40;
const MAX_OVERVIEW = 800;
const MAX_PERSONALITY = 400;
const MAX_APPEARANCE = 300;
const MAX_SPEECH = 200;
const MAX_AFFILIATION = 80;
const MAX_EVENTS = 12;
const MAX_EVENT = 400;
/** A relationship's name rides on the line between two boxes. */
const MAX_LABEL = 20;

export function characters(asked: readonly CharacterAnswer[]): Character[] {
	const out: Character[] = [];
	for (const person of asked) {
		const name = clip(person.name, MAX_NAME);
		if (name === "" || out.some((kept) => kept.name === name)) continue;
		out.push({
			name,
			aliases: list(person.aliases, MAX_NAME, MAX_CHARACTERS).filter(
				(alias) => alias !== name,
			),
			role: person.role,
			overview: clip(person.overview, MAX_OVERVIEW),
			personality: clip(person.personality, MAX_PERSONALITY),
			appearance: clip(person.appearance, MAX_APPEARANCE),
			speech: clip(person.speech, MAX_SPEECH),
			affiliation: clip(person.affiliation, MAX_AFFILIATION),
			events: list(person.events, MAX_EVENT, MAX_EVENTS),
		});
		if (out.length === MAX_CHARACTERS) break;
	}
	return out;
}

/** Keeps only the relations that join two people the list knows about. */
export function relations(
	asked: readonly RelationAnswer[],
	characters: readonly Character[],
): Relation[] {
	const known = new Set(characters.map((person) => person.name));
	const out: Relation[] = [];
	for (const relation of asked) {
		const from = clip(relation.from, MAX_NAME);
		const to = clip(relation.to, MAX_NAME);
		const label = clip(relation.label, MAX_LABEL);
		if (label === "" || from === to || !known.has(from) || !known.has(to))
			continue;
		// The same tie stated twice, once from each end, is one line.
		const already = out.some(
			(kept) =>
				kept.label === label &&
				((kept.from === from && kept.to === to) ||
					(kept.from === to && kept.to === from)),
		);
		if (already) continue;
		out.push({ from, to, label, mutual: relation.mutual });
		if (out.length === MAX_RELATIONS) break;
	}
	return out;
}

function list(
	values: readonly string[],
	longest: number,
	most: number,
): string[] {
	const out: string[] = [];
	for (const value of values) {
		const kept = clip(value, longest);
		if (kept === "" || out.includes(kept)) continue;
		out.push(kept);
		if (out.length === most) break;
	}
	return out;
}
