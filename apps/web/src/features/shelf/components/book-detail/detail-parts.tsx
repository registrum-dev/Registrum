// The pieces both halves of a book's screen are built from.

import { cn } from "@registrum/ui/lib/utils";
import { useTranslation } from "react-i18next";

/** Text the reader wrote or the book carries, with its paragraphs kept. */
export function Prose({ children }: { children: string }) {
	return (
		<p className="max-w-[62ch] whitespace-pre-wrap text-sm leading-loose">
			{children}
		</p>
	);
}

/** A heading and everything under it. Every block of the record column is one. */
export function DetailSection({
	title,
	action,
	children,
}: {
	title: string;
	/** The one thing this block offers, sitting out to its right. */
	action?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-3">
			<div className="flex items-center gap-3.5">
				<h2 className="font-semibold font-serif text-[15px] tracking-[0.06em]">
					{title}
				</h2>
				{/* The rule runs from the heading to the edge of the column, so the
            blocks are told apart by a line rather than by a box. */}
				<span className="h-px min-w-6 flex-1 bg-border/60" />
				{action}
			</div>
			{children}
		</section>
	);
}

/** A name on the left and its value beside it, on a hairline. The side that
 *  knows there is no value hands over null rather than a word to read back. */
export function DetailRow({
	label,
	value,
	numeric,
	children,
}: {
	label: string;
	value: string | null;
	numeric?: boolean;
	/** Drawn in place of `value` when there is one, which is still the tooltip. */
	children?: React.ReactNode;
}) {
	const { t } = useTranslation();
	const shown = value ?? t("common.empty");
	return (
		<div className="flex items-baseline gap-3.5 border-border/50 border-b py-2.5">
			<span className="w-26 shrink-0 text-muted-foreground text-xs">
				{label}
			</span>
			<span
				className={cn(
					"truncate text-sm",
					numeric && "tabular-nums",
					value === null && "text-muted-foreground",
				)}
				title={shown}
			>
				{value !== null && children ? children : shown}
			</span>
		</div>
	);
}

export function Absent({ children }: { children: string }) {
	return <p className="text-muted-foreground text-sm">{children}</p>;
}
