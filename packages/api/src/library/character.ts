// The characters a generation wrote down, and the relations between them.

import { createId } from "@paralleldrive/cuid2";
import { type Client, type Database, transaction } from "@registrum/db";

import * as fold from "../lib/fold";
import { type CharacterRole, readRole } from "../vocabulary";

/** One person, as a card shows them. */
export interface Character {
	name: string;
	role: CharacterRole;
	aliases: string[];
	overview: string;
	personality: string;
	appearance: string;
	speech: string;
	affiliation: string;
	events: string[];
}

/** One line on the map. Both ends are people by name, which is what the model
 *  is asked for and what the screen draws; the rows hold ids. */
export interface Relation {
	from: string;
	to: string;
	label: string;
	mutual: boolean;
}

/** What a book already carries. `null` either way is "nothing generated yet",
 *  which is also what a map with no lines left in it comes back as. */
export interface SavedAi {
	characters: Character[] | null;
	relations: Relation[] | null;
}

export async function savedAiOf(db: Client, bookId: string): Promise<SavedAi> {
	const people = await db.character.findMany({
		where: { bookId },
		orderBy: { position: "asc" },
		include: {
			aliases: { orderBy: { position: "asc" }, select: { name: true } },
			events: { orderBy: { position: "asc" }, select: { text: true } },
		},
	});
	if (people.length === 0) return { characters: null, relations: null };

	// Read as names, which is what draws it.
	const relations = await db.characterRelation.findMany({
		where: { bookId },
		orderBy: { position: "asc" },
		select: {
			label: true,
			mutual: true,
			from: { select: { name: true } },
			to: { select: { name: true } },
		},
	});

	return {
		characters: people.map((person) => ({
			name: person.name,
			role: readRole(person.role) ?? "minor",
			aliases: person.aliases.map((alias) => alias.name),
			overview: person.overview,
			personality: person.personality,
			appearance: person.appearance,
			speech: person.speech,
			affiliation: person.affiliation,
			events: person.events.map((event) => event.text),
		})),
		relations:
			relations.length > 0
				? relations.map((relation) => ({
						from: relation.from.name,
						to: relation.to.name,
						label: relation.label,
						mutual: relation.mutual,
					}))
				: null,
	};
}

/** One of a person's ordered lists, in the order given with the blank entries
 *  left out. */
function listed(
	values: readonly string[],
): { position: number; value: string }[] {
	return values
		.map((value) => value.trim())
		.filter(Boolean)
		.map((value, position) => ({ position, value }));
}

/** Writes new characters, and drops the relations with them. */
export async function setCharacters(
	db: Database,
	bookId: string,
	characters: readonly Character[],
): Promise<void> {
	await transaction(db, async (tx) => {
		// The lists and the map go with the people by `onDelete: Cascade`.
		await tx.character.deleteMany({ where: { bookId } });

		const seen = new Set<string>();
		let position = 0;
		for (const person of characters) {
			// A person with no name is a person nothing can point at, and the same
			// name twice is one person. Either would fail the unique index.
			const name = person.name.trim();
			if (name === "" || seen.has(name)) continue;
			seen.add(name);

			await tx.character.create({
				data: {
					id: createId(),
					bookId,
					position: position++,
					name,
					nameKey: fold.sortKey(name),
					role: person.role,
					overview: person.overview,
					personality: person.personality,
					appearance: person.appearance,
					speech: person.speech,
					affiliation: person.affiliation,
					aliases: {
						create: listed(person.aliases).map(({ position, value }) => ({
							position,
							name: value,
						})),
					},
					events: {
						create: listed(person.events).map(({ position, value }) => ({
							position,
							text: value,
						})),
					},
				},
			});
		}
	});
}

/** Writes the map between people who are already written down. */
export async function setRelations(
	db: Database,
	bookId: string,
	relations: readonly Relation[],
): Promise<void> {
	await transaction(db, async (tx) => {
		const people = await tx.character.findMany({
			where: { bookId },
			select: { id: true, name: true },
		});
		const ids = new Map(people.map((person) => [person.name, person.id]));
		await tx.characterRelation.deleteMany({ where: { bookId } });

		const rows: {
			bookId: string;
			position: number;
			fromId: string;
			toId: string;
			label: string;
			mutual: boolean;
		}[] = [];
		for (const relation of relations) {
			const label = relation.label.trim();
			const fromId = ids.get(relation.from.trim());
			const toId = ids.get(relation.to.trim());
			if (!fromId || !toId || label === "" || fromId === toId) continue;
			rows.push({
				bookId,
				position: rows.length,
				fromId,
				toId,
				label,
				mutual: relation.mutual,
			});
		}
		if (rows.length > 0) await tx.characterRelation.createMany({ data: rows });
	});
}
