// The settings there are before a library exists.

import { ScrollArea } from "@Registrum/ui/components/scroll-area";
import { useTranslation } from "react-i18next";
import { AdaptiveDialog } from "@/components/adaptive-dialog";
import { LanguagePicker } from "@/components/language-picker";
import { SettingsSection } from "@/components/settings-section";
import { ThemePicker } from "@/components/theme-picker";
import { AiSettings } from "@/features/ai/components/ai-settings";

export function SettingsDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { t } = useTranslation();

	return (
		<AdaptiveDialog
			open={open}
			onOpenChange={onOpenChange}
			title={t("settings.title")}
			className="sm:max-w-[640px]"
		>
			{/* Tall on a short window, so the dialog scrolls rather than the page
          behind it. A phone's sheet scrolls on its own. */}
			<ScrollArea className="desktop:-mx-1 desktop:max-h-[60vh] desktop:px-1">
				<div className="motion-cascade flex flex-col gap-7 py-1 [--step:70ms]">
					<SettingsSection title={t("settings.language")}>
						<LanguagePicker />
					</SettingsSection>

					<SettingsSection title={t("ai.title")}>
						<AiSettings />
					</SettingsSection>

					<SettingsSection title={t("display.theme")}>
						<ThemePicker className="w-full max-w-sm rounded-xl border border-border bg-card p-1" />
					</SettingsSection>
				</div>
			</ScrollArea>
		</AdaptiveDialog>
	);
}
