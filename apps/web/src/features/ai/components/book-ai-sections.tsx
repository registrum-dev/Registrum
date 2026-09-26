// The cast and the map, where a book's record is read.

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@Registrum/ui/components/empty";
import { MessagesSquareIcon, NetworkIcon, UsersIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Section } from "@/features/library/components/book-detail/detail-parts";
import type { BookRecord } from "@/features/library/types";
import { api } from "@/lib/api";
import { rememberCast, rememberGraph, useAiReady, useBookAi } from "../queries";
import { type Character, type Graph, hasBookText } from "../types";
import { useBookChat } from "../use-book-chat";
import { useGeneration } from "../use-generation";
import { CharacterCards } from "./character-cards";
import { CharacterMap } from "./character-map";
import { ChatPane } from "./chat-pane";
import {
	GenerateButton,
	GeneratedBlock,
	UsageLine,
	WholeBookNote,
} from "./generation";

/** Whether this book can be generated for at all. */
function canGenerateCast(book: BookRecord): boolean {
	return book.category === "novel" && hasBookText(book.format);
}

/** Which of the three things there is to say about a map that is not there. */
function mapEmptyNote(ready: boolean, hasCast: boolean) {
	if (!ready) return "ai.notConfigured";
	return hasCast ? "ai.mapEmpty" : "error.noCast";
}

/** Everything on this screen that is asked of a model: the cast, the map, and
 *  the questions. */
export function BookAiSections({
	book,
	shelfId,
}: {
	book: BookRecord;
	shelfId: string;
}) {
	return (
		<>
			<CastSections book={book} shelfId={shelfId} />
			<AskSection book={book} shelfId={shelfId} />
		</>
	);
}

/** The chat, which any book with words in it can have. */
function AskSection({ book, shelfId }: { book: BookRecord; shelfId: string }) {
	const { t } = useTranslation();
	// Listing the chapters means reading the book, and this section is drawn
	// without being asked for. Nothing is read until the pane is touched.
	const [woken, setWoken] = useState(false);
	const chat = useBookChat({
		shelfId,
		bookId: book.id,
		at: null,
		offered: woken,
	});

	if (!hasBookText(book.format)) return null;

	return (
		<Section title={t("ai.ask")}>
			<p className="text-muted-foreground text-xs leading-relaxed">
				{t("ai.askNote")}
			</p>
			{chat.ready ? (
				// A height on a wide screen, so the page does not grow by a screenful
				// with every answer; on a narrow one the page grows instead, rather
				// than putting a second scroll inside the first.
				<ChatPane
					chat={chat}
					onWake={() => setWoken(true)}
					className="h-[30rem] phone:h-auto"
				/>
			) : (
				<NothingYet
					icon={<MessagesSquareIcon />}
					title={t("ai.noAsking")}
					description={t("ai.notConfigured")}
				/>
			)}
		</Section>
	);
}

function CastSections({
	book,
	shelfId,
}: {
	book: BookRecord;
	shelfId: string;
}) {
	const { t } = useTranslation();

	const offered = canGenerateCast(book);
	const stored = useBookAi(shelfId, book.id, offered);
	const characters = stored.data?.characters ?? null;
	const graph = stored.data?.graph ?? null;

	const ready = useAiReady();

	const cast = useGeneration<Character[]>(
		(run, locale) =>
			api.ai.characters.mutate({ shelfId, id: book.id, locale, run }),
		(found) => rememberCast(shelfId, book.id, found),
	);

	// The server reads the cast from the library; this screen's copy may be one
	// generation out of date.
	const map = useGeneration<Graph>(
		(run, locale) => api.ai.graph.mutate({ shelfId, id: book.id, locale, run }),
		(found) => rememberGraph(shelfId, book.id, found),
	);

	if (!offered) return null;
	const hasCast = Boolean(characters?.length);

	return (
		<>
			<Section title={t("ai.characters")}>
				<GeneratedBlock
					note={<WholeBookNote />}
					button={
						<GenerateButton
							pending={cast.pending}
							disabled={!ready || map.pending}
							again={hasCast}
							onStart={cast.start}
							onStop={cast.stop}
						/>
					}
					generation={cast}
					loading={stored.isPending}
					empty={
						<NothingYet
							icon={<UsersIcon />}
							title={t("ai.noCharacters")}
							description={
								ready ? t("ai.charactersNote") : t("ai.notConfigured")
							}
						/>
					}
				>
					{characters && characters.length > 0 && (
						<>
							<CharacterCards characters={characters} />
							{cast.result && <UsageLine usage={cast.result.usage} />}
						</>
					)}
				</GeneratedBlock>
			</Section>

			<Section title={t("ai.map")}>
				<GeneratedBlock
					note={
						<p className="text-muted-foreground text-xs leading-relaxed">
							{t("ai.mapNote")}
						</p>
					}
					button={
						<GenerateButton
							pending={map.pending}
							// Unavailable rather than failing when pressed.
							disabled={!ready || cast.pending || !hasCast}
							again={Boolean(graph?.relations.length)}
							onStart={map.start}
							onStop={map.stop}
						/>
					}
					generation={map}
					loading={stored.isPending}
					empty={
						<NothingYet
							icon={<NetworkIcon />}
							title={t("ai.noMap")}
							description={t(mapEmptyNote(ready, hasCast))}
						/>
					}
				>
					{graph &&
						graph.relations.length > 0 &&
						characters &&
						characters.length > 0 && (
							<>
								<CharacterMap characters={characters} graph={graph} />
								{map.result && <UsageLine usage={map.result.usage} />}
							</>
						)}
				</GeneratedBlock>
			</Section>
		</>
	);
}

function NothingYet({
	icon,
	title,
	description,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
}) {
	return (
		<Empty className="border border-border border-dashed bg-transparent py-8">
			<EmptyHeader>
				<EmptyMedia
					variant="icon"
					className="rounded-xl bg-accent text-accent-foreground"
				>
					{icon}
				</EmptyMedia>
				<EmptyTitle className="text-sm">{title}</EmptyTitle>
				<EmptyDescription className="text-xs">{description}</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}
