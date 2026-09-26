// Changing one of the shelf's names.

import { Button } from "@registrum/ui/components/button";
import {
	Field,
	FieldDescription,
	FieldLabel,
} from "@registrum/ui/components/field";
import { Input } from "@registrum/ui/components/input";
import { useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Confirm } from "@/components/confirm";
import { useRenameFacet } from "@/features/shelf/mutations";
import type { FacetKind } from "@/features/shelf/types";
import { useEnterToSend } from "@/hooks/use-enter-to-send";
import { showNotice } from "@/store/alert";

/** The one thing this screen changes: what this name is called. */
export function FacetRename({
	kind,
	name,
	from,
	taken,
	count,
}: {
	kind: FacetKind;
	name: string;
	/** The book whose sheet is waiting underneath, kept through the rename. */
	from?: string;
	/** The shelf's other names of this kind, which is what makes a merge. */
	taken: string[];
	/** How many books would come along, for the pause before a merge. */
	count: number;
}) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const rename = useRenameFacet();
	const field = useId();

	// The name in the address is the name being edited, so arriving at another
	// one -- the back button, or the merge this screen just made -- starts over:
	// the sheet keys what it draws on the name (facet-sheet.tsx).
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
						showNotice(t("facet.merged", { from: name, to: renamed.name }));
					}
					// Replaced, not pushed: the screen is still this name, spelled the
					// way it now is. Back goes where the reader came from.
					void navigate({
						to: "/facet",
						search: { kind, value: renamed.name, from },
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
				{t("facet.rename")}
			</h2>

			<Field className="max-w-xl gap-2">
				<FieldLabel htmlFor={field} className="sr-only">
					{t("facet.rename")}
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
					{joins ? t("facet.taken", { name: wanted }) : t("facet.renameHint")}
				</FieldDescription>
			</Field>

			<Confirm
				open={merging}
				onOpenChange={setMerging}
				title={t("facet.mergeTitle", { from: name, to: wanted })}
				description={t("facet.mergeDescription", {
					from: name,
					to: wanted,
					count,
				})}
				confirmLabel={t("facet.merge")}
				onConfirm={write}
			/>
		</section>
	);
}
