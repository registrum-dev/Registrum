// The pieces the first screen's two sections are built from.

import { cn } from "@registrum/ui/lib/utils";
import { CheckIcon, ChevronRightIcon, LibraryIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { shelfDetail } from "../labels";
import { useShelves } from "../shelf-queries";
import { useShelfStore } from "../store";
import type { Shelf } from "../types";
import { RowIcon, RowText } from "./toolbar/shelf-switcher";

/** One of the two questions, numbered so that what is left can be seen. */
export function StepSection({
	n,
	title,
	done,
	doneLabel,
	waiting,
	children,
}: {
	n: number;
	title: string;
	/** The question has its answer. */
	done: boolean;
	/** What is said beside the title once it has. */
	doneLabel?: string;
	/** The question cannot be asked until the one above is answered. */
	waiting?: boolean;
	children: React.ReactNode;
}) {
	const { t } = useTranslation();

	return (
		<section
			className={cn(
				"motion-rise flex flex-col gap-3 transition-opacity duration-[var(--dur-standard)]",
				waiting && "opacity-50",
			)}
		>
			<div className="flex items-center gap-2">
				<span
					className={cn(
						"flex size-5 shrink-0 items-center justify-center rounded-full font-semibold text-[11px]",
						waiting
							? "bg-muted text-muted-foreground"
							: "bg-accent text-accent-foreground",
					)}
				>
					{n}
				</span>
				<h2 className="min-w-0 flex-1 truncate font-semibold text-[13px]">
					{title}
				</h2>
				{done && (
					<span className="flex shrink-0 items-center gap-1 text-accent-foreground text-xs">
						<CheckIcon className="size-3.5" />
						{doneLabel ?? t("shelfSetup.decided")}
					</span>
				)}
			</div>
			{children}
		</section>
	);
}

/** Nothing to ask yet: the folder comes first. */
export function FolderFirstNote() {
	const { t } = useTranslation();

	return (
		<p className="rounded-xl border border-input border-dashed px-4 py-3.5 text-muted-foreground text-xs leading-relaxed">
			{t("shelfSetup.nameLater")}
		</p>
	);
}

/** Nothing to ask: the folder is a shelf already. */
export function AlreadyShelfNote() {
	const { t } = useTranslation();

	return (
		<div className="flex gap-2.5 rounded-xl bg-accent px-4 py-3.5 text-accent-foreground">
			<LibraryIcon className="mt-0.5 size-4 shrink-0" />
			<div className="flex min-w-0 flex-col gap-1">
				<span className="font-semibold text-[13px]">
					{t("shelfSetup.knownTitle")}
				</span>
				<span className="text-xs leading-relaxed">
					{t("shelfSetup.knownNote")}
				</span>
			</div>
		</div>
	);
}

/** The shelves the server already holds, above the two questions: going
 *  back to one asks neither of them. */
export function ShelfList() {
	const { t } = useTranslation();
	const shelves = useShelves().data ?? [];
	if (shelves.length === 0) return null;

	return (
		<section className="motion-rise flex flex-col gap-3">
			<h2 className="font-semibold text-[13px]">{t("shelf.shelves")}</h2>
			<div className="flex flex-col gap-0.5 rounded-xl border border-border bg-card p-1.5">
				{shelves.map((shelf) => (
					<ShelfRow key={shelf.id} shelf={shelf} />
				))}
			</div>
		</section>
	);
}

function ShelfRow({ shelf }: { shelf: Shelf }) {
	const switchTo = useShelfStore((state) => state.switchTo);
	const busy = useShelfStore((state) => state.busy === "loading");
	const gone = shelf.missing;

	return (
		<button
			type="button"
			disabled={busy}
			onClick={() => void switchTo(shelf.id)}
			className="flex min-h-12 items-center gap-3 rounded-lg px-2.5 py-2 text-start text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0"
		>
			<RowIcon gone={gone} />
			<RowText name={shelf.name} detail={shelfDetail(shelf)} gone={gone} />
			<ChevronRightIcon className="text-muted-foreground" />
		</button>
	);
}
