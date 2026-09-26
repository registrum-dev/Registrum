// One book's conversation, from the screen's side.

import { useRef, useState } from "react";

import { api } from "@/lib/api";
import { type Exchange, useBookChats, useChat } from "./chat-store";
import { useAiConfigured, useBookChapters } from "./queries";
import type { Chapter, Sent, Turn, Usage } from "./types";
import { useGeneration } from "./use-generation";

export interface BookChat {
	/** What can be picked, and what is picked. */
	chapters: Chapter[];
	chaptersPending: boolean;
	selected: number[];
	setSelected: (sections: number[]) => void;
	/** The exchanges so far, and the question still out. */
	exchanges: Exchange[];
	asking: { question: string; sections: number[] } | null;
	clear: () => void;
	/** What the composer holds. Cleared when a question goes, and handed back
	 *  if nothing came of it. */
	draft: string;
	setDraft: (draft: string) => void;
	send: () => void;
	stop: () => void;
	pending: boolean;
	sent: Sent | null;
	seconds: number;
	/** What the last answer cost, as the endpoint reported it. */
	usage: Usage | null;
	/** Whether an endpoint and a model have been named at all. */
	ready: boolean;
}

/**
 * Holds one book's conversation: the chapters it may draw on, what has been
 * asked, and the one question that is out.
 */
export function useBookChat({
	shelfId,
	bookId,
	at,
	offered,
}: {
	shelfId: string;
	bookId: string;
	/** Where the book is being read right now, when the screen knows. */
	at: number | null;
	/** False where the screen draws no chat at all, so no book is read for one. */
	offered: boolean;
}): BookChat {
	const ready = useAiConfigured();

	const listed = useBookChapters(shelfId, bookId, at, offered && ready);
	const { exchanges, picked, draft } = useChat(bookId);
	const pick = useBookChats((state) => state.pick);
	const write = useBookChats((state) => state.write);
	const remember = useBookChats((state) => state.remember);
	const forget = useBookChats((state) => state.forget);

	const [asking, setAsking] = useState<BookChat["asking"]>(null);

	const setDraft = (next: string) => write(bookId, next);

	const chapters = listed.data?.chapters ?? [];
	const selected = picked ?? listed.data?.defaultSections ?? [];

	/** What the call that is out carries, as it was when it went. */
	const going = useRef<{
		question: string;
		sections: number[];
		history: Turn[];
	}>({
		question: "",
		sections: [],
		history: [],
	});

	const generation = useGeneration<string>(
		(run, locale) =>
			api.ai.ask.mutate({
				shelfId,
				id: bookId,
				locale,
				runId: run,
				asked: going.current,
			}),
		(answer) => {
			remember(bookId, {
				id: crypto.randomUUID(),
				question: going.current.question,
				answer,
				sections: going.current.sections,
			});
			setAsking(null);
		},
		// A question nobody answered goes back in the box, whether the endpoint
		// refused it or the reader stopped it.
		() => {
			setDraft(going.current.question);
			setAsking(null);
		},
	);

	const send = () => {
		const question = draft.trim();
		if (!question || generation.pending || selected.length === 0) return;

		going.current = {
			question,
			sections: selected,
			history: exchanges.flatMap(asTurns),
		};
		setAsking({ question, sections: selected });
		setDraft("");
		generation.start();
	};

	return {
		chapters,
		chaptersPending: listed.isPending && offered && ready,
		selected,
		setSelected: (sections) => pick(bookId, sections),
		exchanges,
		asking,
		clear: () => forget(bookId),
		draft,
		setDraft,
		send,
		stop: generation.stop,
		pending: generation.pending,
		sent: generation.sent,
		seconds: generation.seconds,
		usage: generation.result?.usage ?? null,
		ready,
	};
}

/** One exchange, as the two messages the model is shown. */
function asTurns(exchange: Exchange): Turn[] {
	return [
		{ speaker: "reader", text: exchange.question },
		{ speaker: "model", text: exchange.answer },
	];
}
