// The characters, as cards.

import { Badge } from "@registrum/ui/components/badge";
import { useTranslation } from "react-i18next";
import type { Character } from "../types";

export function CharacterCards({ characters }: { characters: Character[] }) {
	return (
		// The characters are at most two dozen, and it has just been written: it is worth
		// watching arrive.
		<div className="motion-cascade grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2.5 [--step:35ms]">
			{characters.map((person) => (
				<CharacterCard key={person.name} person={person} />
			))}
		</div>
	);
}

function CharacterCard({ person }: { person: Character }) {
	const { t } = useTranslation();

	return (
		<article className="motion-rise flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5">
			<header className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
				<h3 className="font-medium text-sm">{person.name}</h3>
				<Badge variant="outline" className="rounded-full text-[11px]">
					{t(`characterRole.${person.role}`)}
				</Badge>
				{person.aliases.length > 0 && (
					<span className="min-w-0 truncate text-muted-foreground text-xs">
						{person.aliases.join(t("common.listSeparator"))}
					</span>
				)}
			</header>

			{/* Empty fields are left out rather than shown as a dash: a card of eight
          dashes says nothing, and this is prose, not a table row. */}
			<dl className="flex flex-col gap-1.5">
				<Fact label={t("ai.overview")} value={person.overview} />
				<Fact label={t("ai.personality")} value={person.personality} />
				<Fact label={t("ai.appearance")} value={person.appearance} />
				<Fact label={t("ai.speech")} value={person.speech} />
				<Fact label={t("ai.affiliation")} value={person.affiliation} />
			</dl>

			{person.events.length > 0 && (
				<div className="flex flex-col gap-1 border-border border-t pt-2.5">
					<span className="text-muted-foreground text-xs">
						{t("ai.events")}
					</span>
					<ul className="flex list-disc flex-col gap-1 pl-4 text-[13px] leading-relaxed">
						{person.events.map((event) => (
							<li key={event}>{event}</li>
						))}
					</ul>
				</div>
			)}
		</article>
	);
}

function Fact({ label, value }: { label: string; value: string }) {
	if (!value) return null;
	return (
		<div className="flex flex-col gap-0.5">
			<dt className="text-muted-foreground text-xs">{label}</dt>
			<dd className="text-[13px] leading-relaxed">{value}</dd>
		</div>
	);
}
