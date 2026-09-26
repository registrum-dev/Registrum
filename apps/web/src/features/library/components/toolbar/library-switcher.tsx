// The shelf's name at the left end of the shelf bar, and the other shelves
// behind it.

import { Button } from "@Registrum/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@Registrum/ui/components/dropdown-menu";
import { cn } from "@Registrum/ui/lib/utils";
import {
	ChevronDownIcon,
	FolderIcon,
	LibraryIcon,
	PlusIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	PhoneSheet,
	SheetBar,
	SheetMenu,
	SheetMenuItem,
} from "@/components/phone-sheet";
import { useShelves } from "@/features/library/folder-queries";
import { shelfDetail } from "@/features/library/labels";
import { useLibrary } from "@/features/library/store";
import { useLayout } from "@/hooks/use-layout";
import { SheetMenuSeparator } from "./sheet-menu-separator";

const TRIGGER =
	"h-10 min-w-0 max-w-56 shrink gap-1.5 rounded-xl px-2.5 font-semibold aria-expanded:bg-muted [&_svg]:text-muted-foreground";

export function LibrarySwitcher() {
	return useLayout() === "phone" ? <PhoneSwitcher /> : <DesktopSwitcher />;
}

/** What the rows are drawn from: every shelf, and which one is open. */
function useSwitcher() {
	const shelfId = useLibrary((state) => state.shelfId);
	const switchTo = useLibrary((state) => state.switchTo);
	const leaveShelf = useLibrary((state) => state.leaveShelf);
	const shelves = useShelves(shelfId !== null).data ?? [];
	const current = shelves.find((shelf) => shelf.id === shelfId);
	return { shelfId, current, shelves, switchTo, leaveShelf };
}

function DesktopSwitcher() {
	const { t } = useTranslation();
	const { shelfId, current, shelves, switchTo, leaveShelf } = useSwitcher();
	if (!shelfId) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						aria-label={t("library.switch")}
						className={TRIGGER}
					/>
				}
			>
				<FolderIcon />
				<span className="min-w-0 truncate">{current?.name ?? ""}</span>
				<ChevronDownIcon />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-80">
				<DropdownMenuRadioGroup
					value={shelfId}
					onValueChange={(next: string) => void switchTo(next)}
				>
					<DropdownMenuLabel>{t("library.shelves")}</DropdownMenuLabel>
					{shelves.map((shelf) => (
						<DropdownMenuRadioItem
							key={shelf.id}
							value={shelf.id}
							closeOnClick
							className="gap-3 py-2"
						>
							<RowIcon gone={!shelf.present} />
							<RowText
								name={shelf.name}
								detail={shelfDetail(shelf)}
								gone={!shelf.present}
							/>
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem onClick={leaveShelf}>
						<PlusIcon />
						{t("library.otherFolder")}
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function PhoneSwitcher() {
	const { t } = useTranslation();
	const { shelfId, current, shelves, switchTo, leaveShelf } = useSwitcher();
	const [open, setOpen] = useState(false);
	if (!shelfId) return null;

	const close = (then: () => void) => {
		setOpen(false);
		then();
	};

	return (
		<>
			<Button
				variant="ghost"
				aria-label={t("library.switch")}
				aria-haspopup="dialog"
				onClick={() => setOpen(true)}
				className={TRIGGER}
			>
				<span className="min-w-0 truncate">{current?.name ?? ""}</span>
				<ChevronDownIcon />
			</Button>
			<PhoneSheet
				open={open}
				onOpenChange={setOpen}
				kind="fit"
				label={t("library.shelves")}
			>
				<SheetBar
					title={t("library.shelves")}
					onClose={() => setOpen(false)}
					className="border-b-0"
				/>
				<SheetMenu>
					{shelves.map((shelf) => (
						<SheetMenuItem
							key={shelf.id}
							icon={<RowIcon gone={!shelf.present} />}
							checked={shelf.id === shelfId}
							onClick={() => close(() => void switchTo(shelf.id))}
							className="py-2"
						>
							<RowText
								name={shelf.name}
								detail={shelfDetail(shelf)}
								gone={!shelf.present}
							/>
						</SheetMenuItem>
					))}
					<SheetMenuSeparator />
					<SheetMenuItem icon={<PlusIcon />} onClick={() => close(leaveShelf)}>
						{t("library.otherFolder")}
					</SheetMenuItem>
				</SheetMenu>
			</PhoneSheet>
		</>
	);
}

export function RowIcon({ gone }: { gone?: boolean }) {
	return (
		<span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
			{gone ? <TriangleAlertIcon /> : <LibraryIcon />}
		</span>
	);
}

export function RowText({
	name,
	detail,
	gone,
}: {
	name: string;
	detail: string;
	gone?: boolean;
}) {
	return (
		<span className={cn("flex min-w-0 flex-1 flex-col", gone && "opacity-55")}>
			<span className="truncate">{name}</span>
			<span className="truncate font-normal text-muted-foreground text-xs">
				{detail}
			</span>
		</span>
	);
}
