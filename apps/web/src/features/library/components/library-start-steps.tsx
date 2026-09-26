// The second question the first screen asks; the first is the folder browser.

import { Input } from "@Registrum/ui/components/input";
import { Label } from "@Registrum/ui/components/label";
import { useTranslation } from "react-i18next";

import { folderLabel } from "../labels";
import { Already, NotYet } from "./library-start-parts";

/** The second question: what the shelf is called. */
export function StepName({
	folder,
	settled,
	name,
	onName,
	busy,
}: {
	/** Null until the first question is answered; nothing is asked before then. */
	folder: string | null;
	/** The folder is a shelf already, so this question is already spent. */
	settled: boolean;
	name: string;
	onName: (name: string) => void;
	busy: boolean;
}) {
	const { t } = useTranslation();
	if (folder === null) return <NotYet />;
	if (settled) return <Already />;

	return (
		<div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-4 py-3.5">
			<Label htmlFor="shelf-name" className="text-muted-foreground text-xs">
				{t("start.shelfName")}
			</Label>
			<Input
				id="shelf-name"
				value={name}
				disabled={busy}
				spellCheck={false}
				placeholder={t("start.shelfNamePlaceholder")}
				onChange={(event) => onName(event.target.value)}
			/>
			<p className="text-[11.5px] text-muted-foreground leading-relaxed">
				{t("start.shelfNameNote", { folder: folderLabel(folder) })}
			</p>
		</div>
	);
}
