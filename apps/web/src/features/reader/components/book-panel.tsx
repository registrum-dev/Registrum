import { ScrollArea } from "@Registrum/ui/components/scroll-area";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@Registrum/ui/components/tabs";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
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
	view: FoliateView | null;
	onNavigate: (target: string) => void;
	onClose: () => void;
}

/** Contents and search, one panel with two tabs. */
export function BookPanel({
	open,
	tab,
	onTabChange,
	toc,
	activeLabel,
	hasToc,
	canSearch,
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
			label={shown === "search" ? t("reader.search") : t("reader.toc")}
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
			</Tabs>
		</ChromePanel>
	);
}
