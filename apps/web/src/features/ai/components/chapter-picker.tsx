// What a question is allowed to draw on.

import { Button } from "@registrum/ui/components/button";
import { Checkbox } from "@registrum/ui/components/checkbox";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@registrum/ui/components/popover";
import { ListIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	PhoneSheet,
	SheetBar,
	SheetBarButton,
	SheetBody,
	SheetDock,
} from "@/components/phone-sheet";
import { useFormFactor } from "@/hooks/use-form-factor";
import { chapterName, chaptersOf } from "../chapter-names";
import type { Chapter } from "../types";

/** The chapters, one tick each. The unit is the chapter, not the spine item:
 *  a chapter that runs across several arrives here as one row. */
export function ChapterPicker({
	chapters,
	selected,
	onSelect,
	loading,
}: {
	chapters: Chapter[];
	selected: number[];
	onSelect: (sections: number[]) => void;
	loading: boolean;
}) {
	const { t } = useTranslation();

	const every = chapters.flatMap((chapter) => chapter.sections);
	const all =
		every.length > 0 && every.every((index) => selected.includes(index));
	const picked = chaptersOf(chapters, selected).length;

	const phone = useFormFactor() === "phone";
	const [open, setOpen] = useState(false);

	const face = (
		<>
			<ListIcon />
			{picked > 0 ? (
				<span className="tabular-nums">
					{t("ai.chapterCount", { count: picked })}
				</span>
			) : (
				t("ai.pickChapters")
			)}
		</>
	);
	const triggerClass = "h-8 shrink-0 gap-1.5 rounded-lg @max-md:flex-1";

	const rows = (
		<>
			{chapters.length === 0 && (
				<p className="px-2 py-1.5 text-muted-foreground text-sm">
					{t("ai.loadingChapters")}
				</p>
			)}
			{chapters.map((chapter) => {
				const checked = chapter.sections.every((index) =>
					selected.includes(index),
				);
				return (
					<label
						key={chapter.index}
						className="flex phone:min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-2 phone:py-2 py-1.5 hover:bg-muted"
					>
						<Checkbox
							checked={checked}
							onCheckedChange={(next: boolean) =>
								onSelect(
									next
										? [...new Set([...selected, ...chapter.sections])]
										: selected.filter(
												(index) => !chapter.sections.includes(index),
											),
								)
							}
						/>
						<span className="min-w-0 flex-1 truncate text-sm">
							{chapterName(chapter)}
						</span>
						<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
							{t("ai.charCount", { chars: chapter.chars.toLocaleString() })}
						</span>
					</label>
				);
			})}
		</>
	);

	const tally = (
		<span className="px-2 text-muted-foreground text-xs tabular-nums">
			{t("ai.chaptersPicked", { picked, total: chapters.length })}
		</span>
	);

	if (phone) {
		return (
			<>
				<Button
					variant="outline"
					size="sm"
					disabled={loading}
					onClick={() => setOpen(true)}
					className={triggerClass}
				>
					{face}
				</Button>
				<PhoneSheet
					open={open}
					onOpenChange={setOpen}
					kind="detent"
					label={t("ai.pickChapters")}
				>
					<SheetBar
						leading={
							<SheetBarButton onClick={() => onSelect(all ? [] : every)}>
								{all ? t("ai.clearAll") : t("ai.selectAll")}
							</SheetBarButton>
						}
						title={t("ai.pickChapters")}
						onClose={() => setOpen(false)}
					/>
					<SheetBody className="flex flex-col p-2">{rows}</SheetBody>
					<SheetDock className="flex items-center justify-between gap-3">
						{tally}
						<Button
							size="lg"
							onClick={() => setOpen(false)}
							className="h-11 rounded-xl px-6"
						>
							{t("common.done")}
						</Button>
					</SheetDock>
				</PhoneSheet>
			</>
		);
	}

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						size="sm"
						disabled={loading}
						className={triggerClass}
					/>
				}
			>
				{face}
			</PopoverTrigger>

			<PopoverContent
				align="end"
				className="w-72 max-w-[calc(100vw-1rem)] gap-0 p-1"
			>
				<div className="flex max-h-72 flex-col overflow-y-auto overscroll-contain">
					{rows}
				</div>

				<div className="mt-1 flex items-center justify-between border-border/60 border-t pt-1">
					<Button
						variant="ghost"
						size="sm"
						className="h-8 rounded-lg"
						onClick={() => onSelect(all ? [] : every)}
					>
						{all ? t("ai.clearAll") : t("ai.selectAll")}
					</Button>
					{tally}
				</div>
			</PopoverContent>
		</Popover>
	);
}
