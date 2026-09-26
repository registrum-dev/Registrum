// What goes inside a sheet: its bar, body, dock and menu.

import { Button } from "@Registrum/ui/components/button";
import { cn } from "@Registrum/ui/lib/utils";
import { CheckIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/** The strip across the top of a sheet: a way back, its name, and one action. */
export function SheetBar({
	leading,
	title,
	trailing,
	onClose,
	className,
}: {
	leading?: ReactNode;
	title: ReactNode;
	/** Defaults to a close button when `onClose` is given. */
	trailing?: ReactNode;
	onClose?: () => void;
	className?: string;
}) {
	const { t } = useTranslation();
	const end =
		trailing ??
		(onClose && (
			<Button
				variant="ghost"
				size="icon"
				aria-label={t("common.close")}
				onClick={onClose}
				className="rounded-xl text-muted-foreground"
			>
				<XIcon />
			</Button>
		));

	return (
		<div
			className={cn(
				"grid min-h-11 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-border border-b px-2 pb-1.5",
				className,
			)}
		>
			<div className="flex justify-start">{leading}</div>
			<h2 className="truncate text-center font-semibold text-[15px]">
				{title}
			</h2>
			<div className="flex justify-end">{end}</div>
		</div>
	);
}

/** A text button for a sheet's bar, the way a phone draws them. */
export function SheetBarButton({
	strong,
	className,
	...props
}: React.ComponentProps<"button"> & { strong?: boolean }) {
	return (
		<button
			type="button"
			className={cn(
				"rounded-lg px-2 py-2 text-[15px] text-primary transition-opacity disabled:opacity-40",
				strong && "font-semibold",
				className,
			)}
			{...props}
		/>
	);
}

/** The part of a sheet that scrolls. */
export function SheetBody({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-sheet-scroll
			className={cn(
				"min-h-0 flex-1 overflow-y-auto p-4 in-data-[kind=fit]:pb-4 pb-[calc(1rem+var(--safe-bottom))] has-[+[data-sheet-dock]]:pb-4",
				className,
			)}
			{...props}
		/>
	);
}

/** What stays at the foot of a sheet, even at half height: it sticks to the window's foot. */
export function SheetDock({
	className,
	children,
}: {
	className?: string;
	children: ReactNode;
}) {
	return (
		<div
			data-sheet-dock
			className={cn(
				"sticky bottom-0 z-10 shrink-0 border-border border-t bg-inherit px-4 pt-2.5 pb-[calc(0.625rem+var(--safe-bottom))]",
				className,
			)}
		>
			{children}
		</div>
	);
}

/** A menu that rises: one choice per row. */
export function SheetMenu({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div role="menu" className={cn("grid p-2 pt-1", className)} {...props} />
	);
}

/** One row of a sheet's menu. `checked` makes it one of a set of choices. */
export function SheetMenuItem({
	checked,
	icon,
	className,
	children,
	...props
}: React.ComponentProps<"button"> & { checked?: boolean; icon?: ReactNode }) {
	return (
		<button
			type="button"
			role={checked === undefined ? "menuitem" : "menuitemradio"}
			aria-checked={checked}
			className={cn(
				"flex min-h-12 items-center gap-3 rounded-xl px-3 text-start text-[15px] transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
				checked && "font-semibold",
				className,
			)}
			{...props}
		>
			{icon}
			<span className="min-w-0 flex-1 truncate">{children}</span>
			{checked !== undefined && (
				<CheckIcon className={cn("!text-primary", !checked && "invisible")} />
			)}
		</button>
	);
}
