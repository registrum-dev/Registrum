// The contents list.

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@registrum/ui/components/empty";
import { cn } from "@registrum/ui/lib/utils";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PANEL_ROW } from "@/features/reader/components/chrome-panel";
import type { TocItem } from "@/features/reader/foliate";
import { useSlidingIndicator } from "@/hooks/use-sliding-indicator";
import { MOVE } from "@/lib/motion";

/** Shared by every row, so the mark travels between them rather than jumping. */
const CURRENT_MARK = "toc-current";

function CurrentMark() {
	const ref = useSlidingIndicator<HTMLSpanElement>(CURRENT_MARK, MOVE);
	return <span ref={ref} className="absolute inset-0 rounded-md bg-accent" />;
}

interface TocListProps {
	toc: TocItem[];
	activeLabel?: string;
	onNavigate: (href: string) => void;
}

/**
 * The rows deliberately have no entrance of their own. The panel sliding in is
 * the animation; a stagger underneath it puts two movements on screen at once
 * and the list reads as jitter rather than as a cascade.
 */
export function TocList({ toc, activeLabel, onNavigate }: TocListProps) {
	const { t } = useTranslation();
	// The first row with this name and only the first: two marks sharing one
	// id cannot decide where they live.
	const current = useMemo(
		() => firstLabelled(toc, activeLabel),
		[toc, activeLabel],
	);

	if (toc.length === 0) {
		return (
			<Empty className="border-0">
				<EmptyHeader>
					<EmptyTitle>{t("reader.noTocTitle")}</EmptyTitle>
					<EmptyDescription>{t("reader.noToc")}</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<nav className="flex flex-col gap-0.5 p-2">
			<TocLevel
				items={toc}
				depth={0}
				current={current}
				onNavigate={onNavigate}
			/>
		</nav>
	);
}

/** Depth-first, which is the order the rows are drawn in. */
function firstLabelled(
	items: TocItem[],
	label: string | undefined,
): TocItem | null {
	if (!label) return null;
	for (const item of items) {
		if (item.label === label) return item;
		const found = item.subitems ? firstLabelled(item.subitems, label) : null;
		if (found) return found;
	}
	return null;
}

interface TocLevelProps {
	items: TocItem[];
	depth: number;
	/** The row the mark belongs to, picked once for the whole list. */
	current: TocItem | null;
	onNavigate: (href: string) => void;
}

function TocLevel({ items, depth, current, onNavigate }: TocLevelProps) {
	const { t } = useTranslation();

	return (
		<>
			{items.map((item, index) => {
				const active = item === current;

				return (
					<div
						key={`${depth}-${index}-${item.href ?? item.label}`}
						className="flex flex-col gap-0.5"
					>
						<button
							type="button"
							disabled={!item.href}
							aria-current={active ? "true" : undefined}
							onClick={() => item.href && onNavigate(item.href)}
							style={{ paddingInlineStart: `${12 + depth * 14}px` }}
							className={cn(
								PANEL_ROW,
								"relative rounded-md pe-3 text-[13px] leading-snug",
								"disabled:pointer-events-none disabled:opacity-60",
								active
									? "font-semibold text-accent-foreground"
									: "text-foreground",
							)}
						>
							{active && <CurrentMark />}
							<span className="relative">
								{item.label || t("reader.untitled")}
							</span>
						</button>

						{item.subitems && item.subitems.length > 0 && (
							<TocLevel
								items={item.subitems}
								depth={depth + 1}
								current={current}
								onNavigate={onNavigate}
							/>
						)}
					</div>
				);
			})}
		</>
	);
}
