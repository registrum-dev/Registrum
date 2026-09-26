// The bar over the shelf.

import { Button } from "@Registrum/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@Registrum/ui/components/dropdown-menu";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@Registrum/ui/components/toggle-group";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@Registrum/ui/components/tooltip";
import { useNavigate } from "@tanstack/react-router";
import {
	FolderOpenIcon,
	LayoutGridIcon,
	MoreHorizontalIcon,
	RegexIcon,
	Rows3Icon,
	SettingsIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LibraryView } from "@/features/library/columns";
import { useLibrary } from "@/features/library/store";
import type { NameKind } from "@/features/library/types";
import { useOpenRule } from "@/features/rule/open";
import { ColumnMenu } from "./column-menu";
import { FilterBar } from "./filter-bar";
import { ScanProgress } from "./scan-progress";
import { SearchBox } from "./search-box";
import { LibrarySwitcher } from "./toolbar/library-switcher";
import { MoreMenu } from "./toolbar/more-menu";
import { ShelfBarLead } from "./toolbar/shelf-bar-lead";
import { SortMenu } from "./toolbar/sort-menu";

interface LibraryToolbarProps {
	/** How many books are left — the shelf below shows exactly these. */
	shown: number;
	/** Missing where no file can be picked: in a browser. */
	onOpenFile?: () => void;
}

/**
 * The bar over the shelf. Both bars are always here and the container query
 * picks one.
 */
export function LibraryToolbar(props: LibraryToolbarProps) {
	return (
		<header className="chrome @container z-20 shrink-0 border-border border-b">
			<NarrowBar {...props} />
			<WideBar {...props} />
			<FilterBar />
			<ScanProgress
				className="@max-3xl:px-3 px-5 py-2.5"
				barClassName="@max-4xl:w-24"
			/>
		</header>
	);
}

/** The search box, which both bars bind to the same query. A name chosen
 *  from under it joins the names already asked for. */
function useSearch() {
	const query = useLibrary((state) => state.query);
	const setQuery = useLibrary((state) => state.setQuery);
	return {
		value: query.q ?? "",
		onChange: (q: string) => setQuery({ q }),
		onPickName: (kind: NameKind, name: string) => {
			const asked = query[kind] ?? [];
			setQuery({
				q: undefined,
				[kind]: asked.includes(name) ? asked : [...asked, name],
			});
		},
	};
}

/** The search box takes a row of its own and the rest folds into one menu. */
function NarrowBar({ shown, onOpenFile }: LibraryToolbarProps) {
	const search = useSearch();

	return (
		<div className="flex @3xl:hidden flex-col gap-2 px-3 pt-2 pb-2.5">
			<div className="flex min-w-0 items-center gap-1">
				<LibrarySwitcher />
				<ShelfBarLead shown={shown} />

				<div className="ml-auto flex min-w-0 items-center gap-1">
					<SortMenu />
					<MoreMenu onOpenFile={onOpenFile} />
					<RuleButton />
					<SettingsButton />
				</div>
			</div>

			<SearchBox {...search} className="h-11 w-full rounded-xl" />
		</div>
	);
}

/** Everything on one row, nothing behind a menu. */
function WideBar({ shown, onOpenFile }: LibraryToolbarProps) {
	const { t } = useTranslation();
	const search = useSearch();
	const view = useLibrary((state) => state.view);
	const setView = useLibrary((state) => state.setView);
	return (
		<div className="@3xl:flex hidden h-14 items-center gap-2.5 ps-3 pe-5">
			<LibrarySwitcher />
			<ShelfBarLead shown={shown} />

			<SearchBox
				{...search}
				className="h-10 @5xl:w-64 w-52 min-w-28 rounded-xl"
			/>

			<div className="ml-auto flex min-w-0 items-center gap-2">
				<SortMenu />

				<ToggleGroup
					value={[view]}
					onValueChange={(value: string[]) => {
						const next = value[0] as LibraryView | undefined;
						if (next) setView(next);
					}}
					variant="outline"
					spacing={0}
					className="h-10 shrink-0 rounded-xl"
				>
					<ToggleGroupItem
						value="grid"
						aria-label={t("library.showAsGrid")}
						className="size-10"
					>
						<LayoutGridIcon />
					</ToggleGroupItem>
					<ToggleGroupItem
						value="table"
						aria-label={t("library.showAsTable")}
						className="size-10"
					>
						<Rows3Icon />
					</ToggleGroupItem>
				</ToggleGroup>

				{view === "table" && <ColumnMenu />}

				{onOpenFile && (
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="ghost"
									size="icon-lg"
									aria-label={t("library.moreActions")}
									className="size-10 shrink-0 rounded-xl text-muted-foreground"
								/>
							}
						>
							<MoreHorizontalIcon />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuGroup>
								<DropdownMenuItem onClick={onOpenFile}>
									<FolderOpenIcon />
									{t("common.openFile")}
								</DropdownMenuItem>
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				)}

				<RuleButton />
				<SettingsButton />
			</div>
		</div>
	);
}

/** The way to the path rule, which fills in records from where the files sit. */
function RuleButton() {
	const { t } = useTranslation();
	const openRule = useOpenRule();

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label={t("rule.title")}
						onClick={() => openRule()}
						className="size-10 shrink-0 rounded-xl text-muted-foreground"
					/>
				}
			>
				<RegexIcon />
			</TooltipTrigger>
			<TooltipContent side="bottom">{t("rule.title")}</TooltipContent>
		</Tooltip>
	);
}

/** The way to the settings screen, where the library folder is chosen. */
function SettingsButton() {
	const { t } = useTranslation();
	const navigate = useNavigate();

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label={t("settings.open")}
						onClick={() => void navigate({ to: "/settings" })}
						className="size-10 shrink-0 rounded-xl text-muted-foreground"
					/>
				}
			>
				<SettingsIcon />
			</TooltipTrigger>
			<TooltipContent side="bottom">{t("settings.title")}</TooltipContent>
		</Tooltip>
	);
}
