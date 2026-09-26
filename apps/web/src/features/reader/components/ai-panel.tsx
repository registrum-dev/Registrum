// Asking about the book while reading it.

import { useTranslation } from "react-i18next";

import { ChatPane } from "@/features/ai/components/chat-pane";
import { useBookChat } from "@/features/ai/use-book-chat";
import {
	ChromePanel,
	ChromePanelHeader,
} from "@/features/reader/components/chrome-panel";

interface AiPanelProps {
	open: boolean;
	shelfId: string;
	bookId: string;
	/** The spine item on screen. The record's own position is written on the way
	 *  out, so while the book is open this is the truer one. */
	at: number | null;
	onClose: () => void;
}

/** The third panel: the same conversation the book's own screen holds. */
export function AiPanel({ open, shelfId, bookId, at, onClose }: AiPanelProps) {
	const { t } = useTranslation();
	// Nothing is read out of the book until the panel is actually open.
	const chat = useBookChat({ shelfId, bookId, at, offered: open });

	return (
		<ChromePanel open={open} sheet="page" label={t("ai.ask")} onClose={onClose}>
			<ChromePanelHeader closeLabel={t("reader.closePanel")} onClose={onClose}>
				<span className="flex-1 px-2 font-medium text-[13px]">
					{t("ai.ask")}
				</span>
			</ChromePanelHeader>

			<div className="flex min-h-0 flex-1 flex-col p-2.5 pt-1">
				<ChatPane chat={chat} />
			</div>
		</ChromePanel>
	);
}
