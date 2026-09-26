// The ⋯ menu of the narrow shelf bar.

import { Button } from "@registrum/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@registrum/ui/components/dropdown-menu";
import {
	Columns3Icon,
	FolderOpenIcon,
	LayoutGridIcon,
	MoreHorizontalIcon,
	Rows3Icon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	PhoneSheet,
	SheetBar,
	SheetMenu,
	SheetMenuItem,
} from "@/components/phone-sheet";
import { SheetMenuSeparator } from "@/components/phone-sheet/sheet-menu-separator";
import type { ShelfView } from "@/features/shelf/columns";
import { useShelfStore } from "@/features/shelf/store";
import { useFormFactor } from "@/hooks/use-form-factor";
import { ColumnItems } from "../column-menu";

/** The view, the columns and the one rare action, folded into one menu. */
export function MoreMenu({ onOpenFile }: { onOpenFile?: () => void }) {
	return useFormFactor() === "phone" ? (
		<PhoneMoreMenu onOpenFile={onOpenFile} />
	) : (
		<DesktopMoreMenu onOpenFile={onOpenFile} />
	);
}

/** The view and the one rare action, as a menu that rises. */
function PhoneMoreMenu({ onOpenFile }: { onOpenFile?: () => void }) {
	const { t } = useTranslation();
	const view = useShelfStore((state) => state.view);
	const setView = useShelfStore((state) => state.setView);
	const [open, setOpen] = useState(false);
	const pick = (next: ShelfView) => {
		setView(next);
		setOpen(false);
	};

	return (
		<>
			<Button
				variant="outline"
				size="icon"
				aria-label={t("shelf.moreActions")}
				onClick={() => setOpen(true)}
				className="size-10 rounded-xl"
			>
				<MoreHorizontalIcon />
			</Button>
			<PhoneSheet
				open={open}
				onOpenChange={setOpen}
				kind="fit"
				label={t("shelf.moreActions")}
			>
				<SheetBar
					title={t("shelf.view")}
					onClose={() => setOpen(false)}
					className="border-b-0"
				/>
				<SheetMenu>
					<SheetMenuItem
						icon={<LayoutGridIcon />}
						checked={view === "grid"}
						onClick={() => pick("grid")}
					>
						{t("view.grid")}
					</SheetMenuItem>
					<SheetMenuItem
						icon={<Rows3Icon />}
						checked={view === "table"}
						onClick={() => pick("table")}
					>
						{t("view.table")}
					</SheetMenuItem>
					{onOpenFile && (
						<>
							<SheetMenuSeparator />
							<SheetMenuItem
								icon={<FolderOpenIcon />}
								onClick={() => {
									setOpen(false);
									onOpenFile();
								}}
							>
								{t("common.openFile")}
							</SheetMenuItem>
						</>
					)}
				</SheetMenu>
			</PhoneSheet>
		</>
	);
}

/** The same set as a dropdown, plus the columns: a desktop table deals them. */
function DesktopMoreMenu({ onOpenFile }: { onOpenFile?: () => void }) {
	const { t } = useTranslation();
	const view = useShelfStore((state) => state.view);
	const setView = useShelfStore((state) => state.setView);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="outline"
						size="icon"
						aria-label={t("shelf.moreActions")}
						className="size-10 rounded-xl"
					/>
				}
			>
				<MoreHorizontalIcon />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{/* Base UI reads a menu label out of its group's context and throws without one. */}
				<DropdownMenuRadioGroup
					value={view}
					onValueChange={(next: string) => setView(next as ShelfView)}
				>
					<DropdownMenuLabel>{t("shelf.view")}</DropdownMenuLabel>
					<DropdownMenuRadioItem value="grid">
						<LayoutGridIcon />
						{t("view.grid")}
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="table">
						<Rows3Icon />
						{t("view.table")}
					</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>

				{(view === "table" || onOpenFile) && <DropdownMenuSeparator />}
				<DropdownMenuGroup>
					{view === "table" && (
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<Columns3Icon />
								{t("shelf.columns")}
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								<ColumnItems />
							</DropdownMenuSubContent>
						</DropdownMenuSub>
					)}
					{onOpenFile && (
						<DropdownMenuItem onClick={onOpenFile}>
							<FolderOpenIcon />
							{t("common.openFile")}
						</DropdownMenuItem>
					)}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
