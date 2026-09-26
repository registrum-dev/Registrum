// Changing one of the library's names.

import { Button } from "@Registrum/ui/components/button";
import {
	Field,
	FieldDescription,
	FieldLabel,
} from "@Registrum/ui/components/field";
import { Input } from "@Registrum/ui/components/input";
import { useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Confirm } from "@/components/confirm";
import { useRenameName } from "@/features/library/mutations";
import type { NameKind } from "@/features/library/types";
import { useEnterToSend } from "@/hooks/use-enter-to-send";
import { showNotice } from "@/store/alert";

/** The one thing this screen changes: what this name is called. */
export function NameRename({
	kind,
	name,
	from,
	taken,
	count,
}: {
	kind: NameKind;
	name: string;
	/** The book whose sheet is waiting underneath, kept through the rename. */
	from?: string;
	/** The library's other names of this kind, which is what makes a merge. */
	taken: string[];
	/** How many books would come along, for the pause before a merge. */
	count: number;
}) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const rename = useRenameName();
	const field = useId();

	// The name in the address is the name being edited, so arriving at another
	// one -- the back button, or the merge this screen just made -- starts over:
	// the sheet keys what it draws on the name (name-sheet.tsx).
	const [draft, setDraft] = useState(name);
	const [merging, setMerging] = useState(false);

	const wanted = draft.trim();
	const changed = wanted !== "" && wanted !== name;
	const joins = changed && taken.includes(wanted);

	const write = () => {
		rename.mutate(
			{ kind, from: name, to: wanted },
			{
				onSuccess: (renamed) => {
					setMerging(false);
					if (renamed.merged) {
						showNotice(t("name.merged", { from: name, to: renamed.name }));
					}
					// Replaced, not pushed: the screen is still this name, spelled the
					// way it now is. Back goes where the reader came from.
					void navigate({
						to: "/name",
						search: { kind, name: renamed.name, from },
						replace: true,
					});
				},
			},
		);
	};

	/** Two names becoming one cannot be undone by typing the old one back. */
	const submit = () => {
		if (!changed || rename.isPending) return;
		if (joins) setMerging(true);
		else write();
	};

	// An Enter that settles what an IME is converting is not a rename.
	const enter = useEnterToSend(submit);

	return (
		<section className="flex flex-col gap-2.5">
			<h2 className="font-semibold text-muted-foreground text-xs tracking-[0.08em]">
				{t("name.rename")}
			</h2>

			<Field className="max-w-xl gap-2">
				<FieldLabel htmlFor={field} className="sr-only">
					{t("name.rename")}
				</FieldLabel>
				<div className="flex items-center gap-2">
					<Input
						id={field}
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						{...enter}
						className="h-10 min-w-0 flex-1"
					/>
					<Button
						onClick={submit}
						disabled={!changed || rename.isPending}
						className="h-10 shrink-0 gap-2 rounded-xl px-4"
					>
						{t("common.save")}
					</Button>
				</div>
				<FieldDescription>
					{joins ? t("name.taken", { name: wanted }) : t("name.renameHint")}
				</FieldDescription>
			</Field>

			<Confirm
				open={merging}
				onOpenChange={setMerging}
				title={t("name.mergeTitle", { from: name, to: wanted })}
				description={t("name.mergeDescription", {
					from: name,
					to: wanted,
					count,
				})}
				confirmLabel={t("name.merge")}
				onConfirm={write}
			/>
		</section>
	);
}
