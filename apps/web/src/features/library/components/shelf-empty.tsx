// What a shelf with nothing on it says.

import { Button } from "@Registrum/ui/components/button";
import type { LucideIcon } from "lucide-react";
import {
	BookOpenIcon,
	PlugZapIcon,
	RefreshCwIcon,
	SearchXIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ScreenEmpty } from "@/components/screen-empty";

/** Why there is nothing to show. The three reasons need different words. */
type ShelfEmptyState = "filtered" | "scanning" | "unscanned" | "empty";

const EMPTY_SHELF = {
	filtered: {
		icon: SearchXIcon,
		title: "shelfEmpty.filteredTitle",
		body: "shelfEmpty.filtered",
	},
	scanning: {
		icon: BookOpenIcon,
		title: "shelfEmpty.emptyTitle",
		body: "shelfEmpty.scanning",
	},
	unscanned: {
		icon: RefreshCwIcon,
		title: "shelfEmpty.unscannedTitle",
		body: "shelfEmpty.unscanned",
	},
	empty: {
		icon: BookOpenIcon,
		title: "shelfEmpty.emptyTitle",
		body: "shelfEmpty.empty",
	},
} as const satisfies Record<
	ShelfEmptyState,
	{ icon: LucideIcon; title: string; body: string }
>;

/** The library could not be opened, and nothing below it can be asked for. */
export function ShelfUnopened({ onRetry }: { onRetry: () => void }) {
	const { t } = useTranslation();

	return (
		<ScreenEmpty
			className="min-h-100"
			icon={<PlugZapIcon />}
			title={t("shelfUnopened.title")}
			description={t("shelfUnopened.description")}
		>
			<Button onClick={onRetry} className="gap-2">
				<RefreshCwIcon />
				{t("shelfUnopened.retry")}
			</Button>
		</ScreenEmpty>
	);
}

/** Nothing to show, for one of three reasons, and they need different words. */
export function ShelfEmpty({
	scanning,
	scanned,
	filtered,
	onClearQuery,
	onScan,
	onOpenFile,
}: {
	scanning: boolean;
	scanned: boolean;
	filtered: boolean;
	onClearQuery: () => void;
	onScan: () => void;
	onOpenFile?: () => void;
}) {
	const { t } = useTranslation();
	const state: ShelfEmptyState = filtered
		? "filtered"
		: scanning
			? "scanning"
			: scanned
				? "empty"
				: "unscanned";
	const said = EMPTY_SHELF[state];
	const Icon = said.icon;

	return (
		<ScreenEmpty
			className="min-h-100"
			icon={<Icon />}
			title={t(said.title)}
			description={t(said.body)}
		>
			{state === "filtered" && (
				<Button variant="ghost" onClick={onClearQuery}>
					{t("filter.clearAll")}
				</Button>
			)}
			{state === "unscanned" && (
				<Button onClick={onScan} className="gap-2">
					<RefreshCwIcon />
					{t("scan.start")}
				</Button>
			)}
			{state === "empty" && onOpenFile && (
				<Button variant="ghost" onClick={onOpenFile}>
					{t("common.openFile")}
				</Button>
			)}
		</ScreenEmpty>
	);
}
