import type { Bookmark } from "@registrum/api/types";
import { ScrollArea } from "@registrum/ui/components/scroll-area";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@registrum/ui/components/tabs";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { BookmarkList } from "@/features/reader/components/bookmark-list";
import {
	ChromePanel,
	ChromePanelHeader,
} from "@/features/reader/components/chrome-panel";
import { SearchTab } from "@/features/reader/components/search-tab";
import { TocList } from "@/features/reader/components/toc-list";
import type { FoliateView, TocItem } from "@/features/reader/foliate";
import type { BookTab } from "@/features/reader/panels";

interface BookPanelProps {
	open: boolean;
	tab: BookTab;
	onTabChange: (tab: BookTab) => void;
	toc: TocItem[];
	activeLabel?: string;
	hasToc: boolean;
	canSearch: boolean;
	/** Null for a book with nowhere to keep them. */
	bookmarks: Bookmark[] | null;
	onRemoveBookmark: (id: string) => void;
	view: FoliateView | null;
	onNavigate: (target: string) => void;
	onClose: () => void;
}

const LABELS = {
	toc: "reader.toc",
	search: "reader.search",
	bookmarks: "reader.bookmarks",
} as const;

/** Contents, search and bookmarks, one panel with a tab each. */
export function BookPanel({
	open,
	tab,
	onTabChange,
	toc,
	activeLabel,
	hasToc,
	canSearch,
	bookmarks,
	onRemoveBookmark,
	view,
	onNavigate,
	onClose,
}: BookPanelProps) {
	const { t } = useTranslation();

	// Held still while the panel leaves, or the tab would swap halfway out.
	const leavingTab = useRef(tab);
	if (open) leavingTab.current = tab;
	const shown = open ? tab : leavingTab.current;

	return (
		<ChromePanel
			open={open}
			sheet="half"
			label={t(LABELS[shown])}
			onClose={onClose}
		>
			<Tabs
				value={shown}
				onValueChange={(value) => onTabChange(value as BookTab)}
				className="flex h-full min-h-0 flex-col gap-0"
			>
				<ChromePanelHeader
					closeLabel={t("reader.closePanel")}
					onClose={onClose}
				>
					<TabsList className="h-10 flex-1 rounded-xl">
						{hasToc && (
							<TabsTrigger value="toc" className="rounded-lg text-[13px]">
								{t("reader.toc")}
							</TabsTrigger>
						)}
						{canSearch && (
							<TabsTrigger value="search" className="rounded-lg text-[13px]">
								{t("reader.search")}
							</TabsTrigger>
						)}
						{bookmarks && (
							<TabsTrigger value="bookmarks" className="rounded-lg text-[13px]">
								{t("reader.bookmarks")}
							</TabsTrigger>
						)}
					</TabsList>
				</ChromePanelHeader>

				{hasToc && (
					<TabsContent value="toc" className="min-h-0 flex-1 overflow-hidden">
						<ScrollArea className="h-full">
							<TocList
								toc={toc}
								activeLabel={activeLabel}
								onNavigate={onNavigate}
							/>
						</ScrollArea>
					</TabsContent>
				)}

				{canSearch && (
					<TabsContent
						value="search"
						keepMounted
						className="min-h-0 flex-1 overflow-hidden"
					>
						<SearchTab
							view={view}
							active={shown === "search"}
							onNavigate={onNavigate}
						/>
					</TabsContent>
				)}

				{bookmarks && (
					<TabsContent
						value="bookmarks"
						className="min-h-0 flex-1 overflow-hidden"
					>
						<ScrollArea className="h-full">
							<BookmarkList
								marks={bookmarks}
								onNavigate={onNavigate}
								onRemove={onRemoveBookmark}
							/>
						</ScrollArea>
					</TabsContent>
				)}
			</Tabs>
		</ChromePanel>
	);
}
