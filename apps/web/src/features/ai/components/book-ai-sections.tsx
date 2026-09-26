// The characters and the map, where a book's record is read.

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@registrum/ui/components/empty";
import { MessagesSquareIcon, NetworkIcon, UsersIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DetailSection } from "@/features/shelf/components/book-detail/detail-parts";
import type { BookRecord } from "@/features/shelf/types";
import { api } from "@/lib/api";
import {
	rememberCharacters,
	rememberRelations,
	useAiConfigured,
	useSavedAi,
} from "../queries";
import { type Character, hasBookText, type Relation } from "../types";
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
} from "./generation-parts";

/** Whether this book can be generated for at all. */
function canGenerateCharacters(book: BookRecord): boolean {
	return book.category === "novel" && hasBookText(book.format);
}

/** Which of the three things there is to say about a map that is not there. */
function mapIntroNote(ready: boolean, hasCharacters: boolean) {
	if (!ready) return "ai.notConfigured";
	return hasCharacters ? "ai.mapIntro" : "error.noCharacters";
}

/** Everything on this screen that is asked of a model: the characters, the map, and
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
			<CharacterSections book={book} shelfId={shelfId} />
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
		<DetailSection title={t("ai.ask")}>
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
		</DetailSection>
	);
}

function CharacterSections({
	book,
	shelfId,
}: {
	book: BookRecord;
	shelfId: string;
}) {
	const { t } = useTranslation();

	const offered = canGenerateCharacters(book);
	const stored = useSavedAi(shelfId, book.id, offered);
	const characters = stored.data?.characters ?? null;
	const relations = stored.data?.relations ?? null;

	const ready = useAiConfigured();

	const charactersRun = useGeneration<Character[]>(
		(run, locale) =>
			api.ai.generateCharacters.mutate({
				shelfId,
				id: book.id,
				locale,
				runId: run,
			}),
		(found) => rememberCharacters(shelfId, book.id, found),
	);

	// The server reads the characters from the shelf; this screen's copy may be one
	// generation out of date.
	const relationsRun = useGeneration<Relation[]>(
		(run, locale) =>
			api.ai.generateRelations.mutate({
				shelfId,
				id: book.id,
				locale,
				runId: run,
			}),
		(found) => rememberRelations(shelfId, book.id, found),
	);

	if (!offered) return null;
	const hasCharacters = Boolean(characters?.length);

	return (
		<>
			<DetailSection title={t("ai.characters")}>
				<GeneratedBlock
					note={<WholeBookNote />}
					button={
						<GenerateButton
							pending={charactersRun.pending}
							disabled={!ready || relationsRun.pending}
							again={hasCharacters}
							onStart={charactersRun.start}
							onStop={charactersRun.stop}
						/>
					}
					generation={charactersRun}
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
							{charactersRun.result && (
								<UsageLine usage={charactersRun.result.usage} />
							)}
						</>
					)}
				</GeneratedBlock>
			</DetailSection>

			<DetailSection title={t("ai.map")}>
				<GeneratedBlock
					note={
						<p className="text-muted-foreground text-xs leading-relaxed">
							{t("ai.mapNote")}
						</p>
					}
					button={
						<GenerateButton
							pending={relationsRun.pending}
							// Unavailable rather than failing when pressed.
							disabled={!ready || charactersRun.pending || !hasCharacters}
							again={Boolean(relations?.length)}
							onStart={relationsRun.start}
							onStop={relationsRun.stop}
						/>
					}
					generation={relationsRun}
					loading={stored.isPending}
					empty={
						<NothingYet
							icon={<NetworkIcon />}
							title={t("ai.noMap")}
							description={t(mapIntroNote(ready, hasCharacters))}
						/>
					}
				>
					{relations &&
						relations.length > 0 &&
						characters &&
						characters.length > 0 && (
							<>
								<CharacterMap characters={characters} relations={relations} />
								{relationsRun.result && (
									<UsageLine usage={relationsRun.result.usage} />
								)}
							</>
						)}
				</GeneratedBlock>
			</DetailSection>
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
