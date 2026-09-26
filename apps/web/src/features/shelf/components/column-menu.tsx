// Which columns the table shows.

import { Button } from "@registrum/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuTrigger,
} from "@registrum/ui/components/dropdown-menu";
import { Columns3Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { columnLabel, HIDEABLE_COLUMNS } from "@/features/shelf/columns";
import { useShelfStore } from "@/features/shelf/store";

/** Which columns the table shows. */
export function ColumnItems() {
	const columns = useShelfStore((state) => state.columns);
	const setColumns = useShelfStore((state) => state.setColumns);

	return (
		<DropdownMenuGroup>
			{HIDEABLE_COLUMNS.map((id) => (
				<DropdownMenuCheckboxItem
					key={id}
					checked={columns[id] !== false}
					onCheckedChange={(checked: boolean) =>
						setColumns({ ...columns, [id]: checked })
					}
				>
					{columnLabel(id)}
				</DropdownMenuCheckboxItem>
			))}
		</DropdownMenuGroup>
	);
}

/** The columns as a button on the toolbar, for when there is room for one. */
export function ColumnMenu() {
	const { t } = useTranslation();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="outline"
						aria-label={t("shelf.columns")}
						// Below the widest toolbar the word goes and the button becomes a square.
						className="@max-5xl:size-10 h-10 @max-5xl:justify-center gap-2 rounded-xl @max-5xl:px-0 px-3.5"
					/>
				}
			>
				<Columns3Icon />
				<span className="@max-5xl:hidden">{t("shelf.columns")}</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<ColumnItems />
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
