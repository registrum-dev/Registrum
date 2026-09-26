import { useTranslation } from "react-i18next";

import {
	ChromePanel,
	ChromePanelHeader,
} from "@/features/reader/components/chrome-panel";
import { ProgressRail } from "@/features/reader/components/progress-rail";

interface ProgressPanelProps {
	open: boolean;
	fraction: number;
	onSeek: (fraction: number) => void;
	onClose: () => void;
}

/** The progress rail, on a sheet of its own. */
export function ProgressPanel({
	open,
	fraction,
	onSeek,
	onClose,
}: ProgressPanelProps) {
	const { t } = useTranslation();

	return (
		<ChromePanel
			open={open}
			sheet="fit"
			label={t("reader.position")}
			onClose={onClose}
		>
			<ChromePanelHeader closeLabel={t("reader.closePanel")} onClose={onClose}>
				<h2 className="flex-1 ps-1.5 font-medium text-[13px]">
					{t("reader.position")}
				</h2>
			</ChromePanelHeader>
			<div className="pb-3">
				<ProgressRail fraction={fraction} onSeek={onSeek} />
			</div>
		</ChromePanel>
	);
}
