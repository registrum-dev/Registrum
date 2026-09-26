// The open shelf's own name, and forgetting it, as the settings screen shows them.

import { Input } from "@Registrum/ui/components/input";
import { Label } from "@Registrum/ui/components/label";
import { useMutation } from "@tanstack/react-query";
import { Trash2Icon } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, trpc } from "@/lib/api";
import { queryClient } from "@/lib/query";
import { showNotice } from "@/store/alert";

import { useCurrentShelf } from "../folder-queries";
import { useLibrary } from "../store";
import { ConfirmButton } from "./confirm-button";

/** The shelves are asked for again: a name or a shelf changed. */
function shelvesChanged(): Promise<void> {
	return queryClient.invalidateQueries({
		queryKey: trpc.shelf.list.queryKey(),
	});
}

export function ShelfSettings() {
	const { t } = useTranslation();
	const field = useId();
	const leaveShelf = useLibrary((state) => state.leaveShelf);
	const shelf = useCurrentShelf();
	/** What is being typed over the shelf's name; null shows the name itself. */
	const [draft, setDraft] = useState<string | null>(null);

	const rename = useMutation({
		mutationFn: (change: { id: string; name: string }) =>
			api.shelf.rename.mutate(change),
		onSuccess: shelvesChanged,
		meta: { failure: "shelfName" },
	});

	const remove = useMutation({
		mutationFn: (gone: { id: string; name: string }) =>
			api.shelf.remove.mutate({ id: gone.id }),
		onSuccess: async (_removed, gone) => {
			leaveShelf();
			await shelvesChanged();
			showNotice(t("shelf.removed", { name: gone.name }));
		},
		meta: { failure: "db" },
	});

	if (!shelf) return null;
	const name = draft ?? shelf.name;

	const commit = () => {
		if (name.trim() === "" || name === shelf.name) {
			setDraft(null);
			return;
		}
		// The field keeps what was typed until the list says what it now is.
		rename.mutate({ id: shelf.id, name }, { onSettled: () => setDraft(null) });
	};

	return (
		<div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
			<div className="flex flex-col gap-1.5">
				<Label htmlFor={field} className="text-muted-foreground text-xs">
					{t("shelf.name")}
				</Label>
				<Input
					id={field}
					value={name}
					spellCheck={false}
					onChange={(event) => setDraft(event.target.value)}
					onBlur={commit}
					onKeyDown={(event) => {
						if (event.key === "Enter") commit();
					}}
				/>
			</div>
			<div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-border border-t pt-3">
				<p className="min-w-0 flex-1 text-muted-foreground text-xs leading-relaxed">
					{t("shelf.removeNote")}
				</p>
				<ConfirmButton
					variant="outline"
					className="gap-2 text-destructive"
					title={t("shelf.removeTitle", { name: shelf.name })}
					description={t("shelf.removeDescription")}
					confirmLabel={t("shelf.remove")}
					onConfirm={() => remove.mutate({ id: shelf.id, name: shelf.name })}
				>
					<Trash2Icon />
					{t("shelf.remove")}
				</ConfirmButton>
			</div>
		</div>
	);
}
