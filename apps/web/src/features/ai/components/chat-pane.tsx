// Asking about a book, wherever the question is asked from.

import { MAX_QUESTION } from "@Registrum/api/types";
import { Button } from "@Registrum/ui/components/button";
import { Textarea } from "@Registrum/ui/components/textarea";
import { cn } from "@Registrum/ui/lib/utils";
import { SendHorizontalIcon, SquareIcon, Trash2Icon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useEnterToSend } from "@/hooks/use-enter-to-send";
import { chapterNames, chaptersOf } from "../labels";
import type { BookChat } from "../use-book-chat";
import { ChapterPicker } from "./chapter-picker";
import { Generating, UsageLine } from "./generation";

/**
 * The whole conversation: what it is drawing on, what has been said, and the
 * box to say the next thing in. The reader panel and the detail screen hand it
 * the same object, so a book has one conversation however it is reached.
 */
export function ChatPane({
	chat,
	onWake,
	className,
}: {
	chat: BookChat;
	/** Said the first time this pane is touched. Where the screen draws the pane
	 *  without being asked for it, that is when the book gets read. */
	onWake?: () => void;
	className?: string;
}) {
	const { t } = useTranslation();
	const nothingPicked = chat.selected.length === 0;
	const enter = useEnterToSend(chat.send);

	return (
		// The band wraps on the width of this pane, not of the window: in the
		// reader it is 352px wide however wide the screen is.
		<div
			onPointerDown={onWake}
			onFocusCapture={onWake}
			className={cn("@container flex min-h-0 flex-1 flex-col gap-3", className)}
		>
			<ContextBand chat={chat} />
			<Exchanges chat={chat} />

			<div className="shrink-0">
				<div className="flex items-end gap-2 rounded-xl border border-input py-1.5 pr-1.5 pl-3 focus-within:border-ring">
					<Textarea
						value={chat.draft}
						maxLength={MAX_QUESTION}
						onChange={(event) => chat.setDraft(event.target.value)}
						{...enter}
						placeholder={
							nothingPicked ? t("ai.pickChaptersFirst") : t("ai.askPlaceholder")
						}
						rows={1}
						className="max-h-32 min-h-0 resize-none border-0 bg-transparent px-0 py-1.5 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
					/>
					{chat.pending ? (
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label={t("common.stop")}
							onClick={chat.stop}
							className="size-8 shrink-0 rounded-lg"
						>
							<SquareIcon />
						</Button>
					) : (
						<Button
							size="icon-sm"
							aria-label={t("ai.send")}
							disabled={nothingPicked || chat.draft.trim() === ""}
							onClick={chat.send}
							className="size-8 shrink-0 rounded-lg"
						>
							<SendHorizontalIcon />
						</Button>
					)}
				</div>

				{chat.usage && !chat.pending && (
					<div className="pt-1.5">
						<UsageLine usage={chat.usage} />
					</div>
				)}
			</div>
		</div>
	);
}

/** What the next question will be answered from, always in the same place. */
function ContextBand({ chat }: { chat: BookChat }) {
	const { t } = useTranslation();
	const picked = chaptersOf(chat.chapters, chat.selected);
	const chars = picked.reduce((sum, chapter) => sum + chapter.chars, 0);

	return (
		<div className="flex shrink-0 @max-md:flex-col items-center @max-md:items-stretch justify-between @max-md:gap-2 gap-3 rounded-xl bg-muted/60 px-3 py-2">
			<span className="min-w-0 @md:truncate text-muted-foreground text-xs">
				{chat.chaptersPending ? (
					t("ai.loadingChapters")
				) : picked.length === 0 ? (
					t("ai.pickChaptersFirst")
				) : (
					<>
						<span className="text-foreground">
							{t("ai.willSend", { names: chapterNames(picked) })}
						</span>
						<span className="tabular-nums">
							{t("common.dotSeparator")}
							{t("ai.charCount", { chars: chars.toLocaleString() })}
						</span>
					</>
				)}
			</span>

			<ChapterPickerSlot chat={chat} />
		</div>
	);
}

/** The picker, and the way to start over. */
function ChapterPickerSlot({ chat }: { chat: BookChat }) {
	const { t } = useTranslation();

	return (
		<span className="flex @max-md:w-full shrink-0 items-center gap-1">
			<ChapterPicker
				chapters={chat.chapters}
				selected={chat.selected}
				onSelect={chat.setSelected}
				loading={chat.chaptersPending}
			/>
			{chat.exchanges.length > 0 && (
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label={t("ai.clearChat")}
					onClick={chat.clear}
					className="size-8 shrink-0 rounded-lg text-muted-foreground"
				>
					<Trash2Icon />
				</Button>
			)}
		</span>
	);
}

/** The exchanges, oldest first, with the question that is still out at the end. */
function Exchanges({ chat }: { chat: BookChat }) {
	const { t } = useTranslation();
	const listRef = useRef<HTMLDivElement>(null);
	const last = chat.asking?.question ?? chat.exchanges.at(-1)?.id ?? null;

	// The list scrolls itself rather than being scrolled into view: the detail
	// screen would otherwise jump down to this section as it opens.
	useEffect(() => {
		const list = listRef.current;
		if (list) list.scrollTop = list.scrollHeight;
	}, [last]);

	if (chat.exchanges.length === 0 && chat.asking === null) {
		return (
			<p className="flex min-h-24 flex-1 items-center justify-center px-6 text-center text-muted-foreground text-xs leading-relaxed">
				{t("ai.askEmpty")}
			</p>
		);
	}

	return (
		<div
			ref={listRef}
			className="flex min-h-24 flex-1 flex-col gap-5 overflow-y-auto pr-0.5"
		>
			{chat.exchanges.map((exchange) => (
				<div key={exchange.id} className="flex flex-col gap-2.5">
					<Question
						chat={chat}
						question={exchange.question}
						sections={exchange.sections}
					/>
					{/* The answer is prose, not a card: it is the one thing on this pane
              meant to be read rather than glanced at. */}
					<p className="whitespace-pre-wrap text-sm leading-relaxed">
						{exchange.answer}
					</p>
				</div>
			))}

			{chat.asking !== null && (
				<div className="flex flex-col gap-2.5">
					<Question
						chat={chat}
						question={chat.asking.question}
						sections={chat.asking.sections}
					/>
					<Generating chapters sent={chat.sent} seconds={chat.seconds} />
				</div>
			)}
		</div>
	);
}

/** One question, and what it was answered from. */
function Question({
	chat,
	question,
	sections,
}: {
	chat: BookChat;
	question: string;
	sections: number[];
}) {
	const { t } = useTranslation();
	const drawn = chaptersOf(chat.chapters, sections);

	return (
		<div className="motion-rise flex flex-col items-end gap-1">
			<span className="max-w-[88%] whitespace-pre-wrap rounded-2xl bg-muted px-3.5 py-2 text-sm">
				{question}
			</span>
			{drawn.length > 0 && (
				<span className="max-w-full truncate px-1 text-[11px] text-muted-foreground">
					{t("ai.basedOn", { names: chapterNames(drawn) })}
				</span>
			)}
		</div>
	);
}
