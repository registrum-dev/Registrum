// What a running scan is doing.

import { Button } from "@registrum/ui/components/button";
import { Progress } from "@registrum/ui/components/progress";
import { Spinner } from "@registrum/ui/components/spinner";
import { cn } from "@registrum/ui/lib/utils";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Presence } from "@/components/presence";
import { useShelfStore } from "@/features/shelf/store";

/** What a running scan is doing, and the way to stop it. */
export function ScanProgressBar({
	className,
	barClassName,
}: {
	/** How the row sits in the screen around it. */
	className?: string;
	/** The bar gives up width first, and each screen has its own room for it. */
	barClassName?: string;
}) {
	const { t } = useTranslation();
	const scan = useShelfStore((state) => state.scan);
	const cancelScan = useShelfStore((state) => state.cancelScan);
	// A scan already running when the screen mounts is simply there.
	const quiet = useRef(scan !== null);
	if (!scan) quiet.current = false;

	return (
		/*
		 * The row takes its height from the screen around it rather than covering
		 * it, so it opens and closes the space as well as itself — a bar that
		 * vanished and left the toolbar an inch taller for a frame was the worst
		 * of both.
		 */
		<Presence>
			{scan && (
				<div
					key="scan"
					className={cn(
						"grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-[var(--dur-standard)] ease-enter",
						!quiet.current && "starting:grid-rows-[0fr] starting:opacity-0",
						"data-leaving:grid-rows-[0fr] data-leaving:opacity-0 data-leaving:duration-[var(--dur-quick)] data-leaving:ease-exit",
					)}
				>
					<div className="min-h-0 overflow-hidden">
						<div
							className={cn(
								"flex items-center gap-3 border-border border-t",
								className,
							)}
						>
							<Spinner className="size-4 text-muted-foreground" />
							<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
								{scan.done + 1} / {scan.total}
							</span>
							<span className="truncate text-muted-foreground text-xs">
								{scan.title}
							</span>
							<div className="ml-auto flex shrink-0 items-center gap-3">
								<Progress
									value={(scan.done / scan.total) * 100}
									aria-label={t("scan.progress")}
									className={cn("w-40", barClassName)}
								/>
								<Button
									variant="ghost"
									size="sm"
									onClick={cancelScan}
									className="h-7 rounded-lg"
								>
									{t("common.stop")}
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</Presence>
	);
}
