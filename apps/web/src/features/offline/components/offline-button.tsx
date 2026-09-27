// Saving a book to this browser, and taking it out again.

import { Button } from "@registrum/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@registrum/ui/components/tooltip";
import { CircleCheckIcon, DownloadIcon, RefreshCwIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Confirm } from "@/components/confirm";
import { useSavedBook } from "@/features/offline/queries";
import { isCurrent, offlineSupported } from "@/features/offline/storage";
import { useSaving } from "@/features/offline/store";
import { useShelfStore } from "@/features/shelf/store";
import type { BookRecord } from "@/features/shelf/types";

export function OfflineButton({ book }: { book: BookRecord }) {
	const { t } = useTranslation();
	const shelfId = useShelfStore((state) => state.shelfId);
	const saved = useSavedBook(book.id).data;
	const progress = useSaving((state) => state.progress[book.id]);
	const save = useSaving((state) => state.save);
	const cancel = useSaving((state) => state.cancel);
	const remove = useSaving((state) => state.remove);
	const [asking, setAsking] = useState(false);

	if (!offlineSupported || !shelfId) return null;

	let label: string;
	let icon: ReactNode;
	let press: () => void;
	if (progress !== undefined) {
		label = t("offline.saving", { percent: Math.round(progress * 100) });
		icon = <ProgressRing fraction={progress} />;
		press = () => cancel(book.id);
	} else if (saved && isCurrent(saved, book)) {
		label = t("offline.savedHere");
		icon = <CircleCheckIcon />;
		press = () => setAsking(true);
	} else if (saved) {
		label = t("offline.update");
		icon = <RefreshCwIcon />;
		press = () => void save(shelfId, book);
	} else if (!book.missing) {
		label = t("offline.save");
		icon = <DownloadIcon className="text-muted-foreground" />;
		press = () => void save(shelfId, book);
	} else {
		return null;
	}

	return (
		<>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							variant="ghost"
							size="icon"
							aria-label={label}
							onClick={press}
							className="size-9 rounded-lg"
						/>
					}
				>
					{icon}
				</TooltipTrigger>
				<TooltipContent>{label}</TooltipContent>
			</Tooltip>
			<Confirm
				open={asking}
				onOpenChange={setAsking}
				title={t("offline.removeTitle", { title: book.title })}
				description={t("offline.removeDescription")}
				confirmLabel={t("offline.remove")}
				destructive
				onConfirm={() => {
					setAsking(false);
					void remove(book.id);
				}}
			/>
		</>
	);
}

/** How much of the file has arrived. */
function ProgressRing({ fraction }: { fraction: number }) {
	const radius = 7;
	const around = 2 * Math.PI * radius;
	return (
		<svg viewBox="0 0 18 18" className="-rotate-90" aria-hidden>
			<circle
				cx="9"
				cy="9"
				r={radius}
				fill="none"
				strokeWidth="2"
				className="stroke-border"
			/>
			<circle
				cx="9"
				cy="9"
				r={radius}
				fill="none"
				strokeWidth="2"
				strokeLinecap="round"
				strokeDasharray={around}
				strokeDashoffset={around * (1 - fraction)}
				className="stroke-foreground transition-[stroke-dashoffset]"
			/>
		</svg>
	);
}
