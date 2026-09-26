import { Button } from "@Registrum/ui/components/button";
import { ScrollArea } from "@Registrum/ui/components/scroll-area";
import { Separator } from "@Registrum/ui/components/separator";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@Registrum/ui/components/tabs";
import { Maximize2Icon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { ThemePicker } from "@/components/theme-picker";
import {
	ChromePanel,
	ChromePanelHeader,
} from "@/features/reader/components/chrome-panel";
import { SectionTitle } from "@/features/reader/components/settings-rows";
import {
	AppearanceSection,
	DetailsSection,
	FixedLayoutSection,
	PageSection,
} from "@/features/reader/components/settings-sections";
import { LTR_DIRECTION, type PageDirection } from "@/features/reader/direction";
import { useSettings } from "@/features/reader/store";
import { useLayout } from "@/hooks/use-layout";

const TABS = ["appearance", "page", "details"] as const;
type SettingsTab = (typeof TABS)[number];

interface SettingsPanelProps {
	open: boolean;
	/** PDF and CBZ are fixed-layout: type settings have nothing to act on. */
	isFixedLayout: boolean;
	/**
	 * Which way the open book actually came out: the preview reads that way, and
	 * the direction row says so, since a switch alone cannot.
	 */
	direction?: PageDirection;
	onToggleFullscreen: () => void;
	onClose: () => void;
}

/** Display settings: how the page is drawn, and the window it is drawn in. */
export function SettingsPanel({
	open,
	isFixedLayout,
	direction = LTR_DIRECTION,
	onToggleFullscreen,
	onClose,
}: SettingsPanelProps) {
	const { t } = useTranslation();
	const reset = useSettings((state) => state.reset);
	// A phone's window is already the whole screen.
	const windowed = useLayout() === "desktop";
	const [tab, setTab] = useState<SettingsTab>("appearance");

	return (
		<ChromePanel
			open={open}
			sheet="peek"
			label={t("reader.displaySettings")}
			onClose={onClose}
		>
			{isFixedLayout ? (
				<>
					<ChromePanelHeader closeLabel={t("display.close")} onClose={onClose}>
						<h2 className="flex-1 ps-1.5 font-medium text-[13px]">
							{t("reader.displaySettings")}
						</h2>
					</ChromePanelHeader>

					<ScrollArea className="min-h-0 flex-1">
						<div className="flex flex-col gap-4 p-4 pt-1.5">
							<section className="flex flex-col gap-2.5">
								<SectionTitle>{t("display.theme")}</SectionTitle>
								<ThemePicker className="w-full" />
							</section>
							<Separator />
							<FixedLayoutSection direction={direction} />
						</div>
					</ScrollArea>
				</>
			) : (
				<Tabs
					value={tab}
					onValueChange={(value) => setTab(value as SettingsTab)}
					className="min-h-0 flex-1 gap-0"
				>
					<ChromePanelHeader closeLabel={t("display.close")} onClose={onClose}>
						<TabsList className="h-10 flex-1 rounded-xl">
							{TABS.map((name) => (
								<TabsTrigger
									key={name}
									value={name}
									className="rounded-lg text-[13px]"
								>
									{t(`display.${name}`)}
								</TabsTrigger>
							))}
						</TabsList>
					</ChromePanelHeader>

					<SettingsTabContent value="appearance">
						<AppearanceSection />
					</SettingsTabContent>
					<SettingsTabContent value="page">
						<PageSection direction={direction} />
					</SettingsTabContent>
					<SettingsTabContent value="details">
						<DetailsSection />
					</SettingsTabContent>
				</Tabs>
			)}

			{/* On the floor rather than last in the list. */}
			<div className="flex shrink-0 gap-2 border-border border-t p-3">
				{windowed && (
					<Button
						variant="outline"
						size="lg"
						onClick={onToggleFullscreen}
						className="flex-1 gap-2"
					>
						<Maximize2Icon />
						{t("reader.fullscreen")}
					</Button>
				)}
				<Button variant="outline" size="lg" onClick={reset} className="flex-1">
					{t("display.reset")}
				</Button>
			</div>
		</ChromePanel>
	);
}

function SettingsTabContent({
	value,
	children,
}: {
	value: SettingsTab;
	children: ReactNode;
}) {
	return (
		<TabsContent value={value} className="min-h-0 flex-1 overflow-hidden">
			<ScrollArea className="h-full">
				<div className="p-4 pt-2">{children}</div>
			</ScrollArea>
		</TabsContent>
	);
}
