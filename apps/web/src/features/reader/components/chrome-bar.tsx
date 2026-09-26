import { cn } from "@registrum/ui/lib/utils";
import {
	ALargeSmallIcon,
	ChevronDownIcon,
	ListIcon,
	SearchIcon,
	SparklesIcon,
} from "lucide-react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import type { OpenPanel, ReaderPanel } from "@/features/reader/panels";

interface ChromeBarProps {
	title: string;
	visible: boolean;
	hasToc: boolean;
	canSearch: boolean;
	/** Whether this book can be asked about at all: an EPUB on the shelf, with an
	 *  endpoint named. */
	canAsk: boolean;
	/** Which one is open, since only one of them can be. */
	panel: ReaderPanel;
	/** How far in the book is, shown in the middle of the bottom row; pressing it opens the rail. */
	fraction: number;
	onTogglePanel: (panel: OpenPanel) => void;
	/** Leaves the book. The reading position is written on the way out. */
	onCloseBook: () => void;
}

/**
 * The way out and the title across the top. Along the bottom, the percentage
 * in the middle, which opens the rail, and what the thumb reaches for in a row
 * on the right.
 * The book leaves downward, so the way out says so.
 */
export function ChromeBar({
	title,
	visible,
	hasToc,
	canSearch,
	canAsk,
	panel,
	fraction,
	onTogglePanel,
	onCloseBook,
}: ChromeBarProps) {
	const { t } = useTranslation();
	const top = visible ? "chrome-enter" : "chrome-leave chrome-leave-up";
	const bottom = visible ? "chrome-enter" : "chrome-leave chrome-leave-down";
	// Contents and search are one sheet with two tabs; a book with no contents
	// opens it on the search. A comic has neither, and no button for it.
	const book: OpenPanel = !hasToc && canSearch ? "search" : "toc";

	return (
		<>
			<header className="chrome pointer-events-none absolute inset-x-0 top-0 z-20 h-[calc(4rem+var(--safe-top))]">
				<div
					className={cn(
						"absolute inset-x-[calc(0.75rem+var(--safe-left))] top-[calc(0.5rem+var(--safe-top))] flex items-center gap-3",
						top,
					)}
				>
					<button
						type="button"
						onClick={onCloseBook}
						className="chrome-surface pointer-events-auto flex h-10 shrink-0 items-center gap-1.5 rounded-full ps-2.5 pe-3.5 text-[13px] [&_svg]:size-4.5"
					>
						<ChevronDownIcon />
						{t("reader.back")}
					</button>
					<div className="chrome-surface pointer-events-auto ms-auto flex h-10 min-w-0 items-center rounded-full px-4">
						<h1 className="truncate text-muted-foreground text-xs tracking-wide">
							{title}
						</h1>
					</div>
				</div>
			</header>

			{/* Three columns so the percentage stays centred on the window, not
          between whatever sits either side of it. */}
			<nav
				className={cn(
					"chrome pointer-events-none absolute inset-x-[calc(0.75rem+var(--safe-left))] bottom-[calc(1rem+var(--safe-bottom))] z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-2",
					bottom,
				)}
			>
				<button
					type="button"
					aria-label={t("reader.position")}
					aria-pressed={panel === "progress"}
					onClick={() => onTogglePanel("progress")}
					className="chrome-surface pointer-events-auto col-start-2 flex h-12 min-w-16 items-center justify-center rounded-full px-4 text-[13px] tabular-nums transition-colors hover:bg-muted aria-pressed:bg-accent aria-pressed:text-accent-foreground"
				>
					{Math.round(fraction * 100)}%
				</button>
				<div className="chrome-surface pointer-events-auto col-start-3 flex gap-0.5 justify-self-end rounded-full p-1">
					{(hasToc || canSearch) && (
						<ChromeAction
							pressed={panel === "toc" || panel === "search"}
							onClick={() => onTogglePanel(book)}
							icon={book === "toc" ? <ListIcon /> : <SearchIcon />}
							label={book === "toc" ? t("reader.toc") : t("reader.search")}
						/>
					)}
					<ChromeAction
						pressed={panel === "settings"}
						onClick={() => onTogglePanel("settings")}
						icon={<ALargeSmallIcon />}
						label={t("reader.display")}
					/>
					{canAsk && (
						<ChromeAction
							pressed={panel === "ai"}
							onClick={() => onTogglePanel("ai")}
							icon={<SparklesIcon />}
							label={t("reader.ask")}
						/>
					)}
				</div>
			</nav>
		</>
	);
}

/** One icon in the bottom row, named for anyone who cannot see it. */
function ChromeAction({
	pressed,
	onClick,
	icon,
	label,
}: {
	pressed: boolean;
	onClick: () => void;
	icon: ReactElement;
	label: string;
}) {
	return (
		<button
			type="button"
			aria-pressed={pressed}
			aria-label={label}
			title={label}
			onClick={onClick}
			className="flex size-10 items-center justify-center rounded-full transition-colors hover:bg-muted aria-pressed:bg-accent aria-pressed:text-accent-foreground [&_svg]:size-4.5"
		>
			{icon}
		</button>
	);
}
