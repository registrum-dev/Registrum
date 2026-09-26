// The exchanges a book is holding, which is nowhere but here.

import { create } from "zustand";

/** One question and the answer it got, with what the answer was drawn from. */
export interface Exchange {
	id: string;
	question: string;
	answer: string;
	/** The spine items that went with the question, which is what the line under
	 *  it names. */
	sections: number[];
}

interface BookChat {
	exchanges: Exchange[];
	/** What the reader ticked. `null` until they touch the picker, and the
	 *  chapters behind them stand in. */
	picked: number[] | null;
	/** What is in the box and has not gone yet. Here rather than in the pane,
	 *  so that a tap on the page — which closes the reader's panel — does not
	 *  swallow a half-typed question. */
	draft: string;
}

const EMPTY: BookChat = { exchanges: [], picked: null, draft: "" };

interface ChatState {
	/** Kept by book, so the detail screen and the reader panel are one
	 *  conversation. Never written down: closing the app ends it. */
	chats: Record<string, BookChat>;
	pick: (bookId: string, sections: number[]) => void;
	write: (bookId: string, draft: string) => void;
	remember: (bookId: string, exchange: Exchange) => void;
	forget: (bookId: string) => void;
}

export const useBookChats = create<ChatState>()((set) => {
	/** Changes one book's chat, leaving every other book's as it was. */
	const patch = (
		bookId: string,
		change: (chat: BookChat) => Partial<BookChat>,
	) =>
		set((state) => {
			const chat = chatOf(state.chats, bookId);
			return {
				chats: { ...state.chats, [bookId]: { ...chat, ...change(chat) } },
			};
		});

	return {
		chats: {},
		pick: (bookId, sections) => patch(bookId, () => ({ picked: sections })),
		write: (bookId, draft) => patch(bookId, () => ({ draft })),
		remember: (bookId, exchange) =>
			patch(bookId, (chat) => ({ exchanges: [...chat.exchanges, exchange] })),
		forget: (bookId) => patch(bookId, () => ({ exchanges: [] })),
	};
});

function chatOf(chats: Record<string, BookChat>, bookId: string): BookChat {
	return chats[bookId] ?? EMPTY;
}

/** What this book is holding. One object for a book nobody has asked about, so
 *  that reading it does not re-render on every other book's exchange. */
export function useChat(bookId: string): BookChat {
	return useBookChats((state) => state.chats[bookId] ?? EMPTY);
}
