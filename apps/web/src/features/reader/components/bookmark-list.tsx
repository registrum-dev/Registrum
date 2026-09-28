// The bookmarks list.

import type { Bookmark } from "@registrum/api/types";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@registrum/ui/components/empty";
import { cn } from "@registrum/ui/lib/utils";
import { BookmarkIcon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PANEL_ROW } from "@/features/reader/components/chrome-panel";

interface BookmarkListProps {
	marks: Bookmark[];
	onNavigate: (cfi: string) => void;
	onRemove: (id: string) => void;
}

export function BookmarkList({
	marks,
	onNavigate,
	onRemove,
}: BookmarkListProps) {
	const { t } = useTranslation();

	if (marks.length === 0) {
		return (
			<Empty className="border-0">
				<EmptyHeader>
					<EmptyTitle>{t("reader.noBookmarksTitle")}</EmptyTitle>
					<EmptyDescription>{t("reader.noBookmarks")}</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<ul className="flex flex-col gap-0.5 p-2">
			{marks.map((mark) => (
				<li key={mark.id} className="flex items-center rounded-md">
					<button
						type="button"
						onClick={() => onNavigate(mark.cfi)}
						className={cn(
							PANEL_ROW,
							"flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-3 text-[13px]",
						)}
					>
						<BookmarkIcon className="size-3.5 shrink-0 fill-current text-muted-foreground" />
						<span className="min-w-0 flex-1 truncate">
							{mark.label || t("reader.untitled")}
						</span>
						<span className="shrink-0 text-[11.5px] text-muted-foreground tabular-nums">
							{Math.round(mark.fraction * 100)}%
						</span>
					</button>
					<button
						type="button"
						aria-label={t("reader.removeBookmark")}
						title={t("reader.removeBookmark")}
						onClick={() => onRemove(mark.id)}
						className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4"
					>
						<XIcon />
					</button>
				</li>
			))}
		</ul>
	);
}
