// Searching the open book.

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@registrum/ui/components/empty";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@registrum/ui/components/input-group";
import { ScrollArea } from "@registrum/ui/components/scroll-area";
import { Spinner } from "@registrum/ui/components/spinner";
import { cn } from "@registrum/ui/lib/utils";
import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { PANEL_ROW } from "@/features/reader/components/chrome-panel";
import type { FoliateView } from "@/features/reader/foliate";
import {
	MAX_MATCHES,
	useBookSearch,
} from "@/features/reader/hooks/use-book-search";

interface SearchTabProps {
	view: FoliateView | null;
	/** True while this is the tab on show, so the field is focused at the right moment. */
	active: boolean;
	onNavigate: (cfi: string) => void;
}

export function SearchTab({ view, active, onNavigate }: SearchTabProps) {
	const { t } = useTranslation();
	const { query, setFilter, groups, status, progress, total, start, clear } =
		useBookSearch(view);
	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (active) inputRef.current?.focus();
	}, [active]);

	return (
		<div className="flex h-full min-h-0 flex-col">
			{/* `pt-1` is not decoration: the tab panel clips its overflow, and without
          it the field's focus ring loses its top edge against that boundary. */}
			<form
				onSubmit={(event) => {
					event.preventDefault();
					start();
				}}
				className="shrink-0 px-3 pt-1 pb-3"
			>
				<InputGroup className="h-10 rounded-xl">
					<InputGroupAddon>
						<SearchIcon />
					</InputGroupAddon>
					{/*
            Plain text, not `type="search"`: the search appearance brings
            Chromium's own clear button and focus treatment, which sit inside
            the group's border and fight the ring drawn around it.
          */}
					<InputGroupInput
						ref={inputRef}
						type="text"
						value={query}
						onChange={(event) => setFilter(event.target.value)}
						placeholder={t("reader.searchText")}
						aria-label={t("reader.searchText")}
						className="appearance-none"
					/>
					{query && (
						<InputGroupAddon align="inline-end">
							<InputGroupButton
								size="icon-xs"
								aria-label={t("reader.clearSearch")}
								onClick={() => {
									clear();
									inputRef.current?.focus();
								}}
							>
								<XIcon />
							</InputGroupButton>
						</InputGroupAddon>
					)}
				</InputGroup>

				<div className="mt-2 flex h-4 items-center gap-1.5 text-[11.5px] text-muted-foreground">
					{status === "idle" && <span>{t("reader.pressEnter")}</span>}
					{status === "running" && (
						<>
							<Spinner className="size-3" />
							<span className="tabular-nums">
								{t("reader.searching", { percent: Math.round(progress * 100) })}
							</span>
						</>
					)}
					{status === "finished" && (
						<span className="tabular-nums">
							{total >= MAX_MATCHES
								? t("reader.matchesAtLeast", { count: total })
								: t("reader.matches", { count: total })}
						</span>
					)}
				</div>
			</form>

			<ScrollArea className="min-h-0 flex-1 border-border border-t">
				{status === "finished" && total === 0 && (
					<Empty className="border-0">
						<EmptyHeader>
							<EmptyTitle>{t("reader.noMatchesTitle")}</EmptyTitle>
							<EmptyDescription>{t("reader.noMatches")}</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}

				{groups.map((group, groupIndex) => (
					<div key={groupIndex} className="fade-in-0 animate-in ease-enter">
						{group.label && (
							<h3 className="sticky top-0 z-10 bg-card/95 px-4 py-2 font-semibold text-[11px] text-muted-foreground tracking-widest backdrop-blur-sm">
								{group.label}
							</h3>
						)}
						{group.matches.map((match) => (
							<button
								key={match.cfi}
								type="button"
								onClick={() => onNavigate(match.cfi)}
								className={cn(
									PANEL_ROW,
									"block px-4 text-[12.5px] text-muted-foreground leading-relaxed",
								)}
							>
								<span>{match.excerpt.pre}</span>
								<mark className="bg-transparent font-semibold text-accent-foreground">
									{match.excerpt.match}
								</mark>
								<span>{match.excerpt.post}</span>
							</button>
						))}
					</div>
				))}
			</ScrollArea>
		</div>
	);
}
