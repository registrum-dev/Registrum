import { Button } from "@registrum/ui/components/button";
import { XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PhoneSheet, type SheetKind } from "@/components/phone-sheet";

/** A row in either panel: full width, hoverable, and ringed when focused. */
export const PANEL_ROW =
	"w-full py-2.5 text-start transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

interface ChromePanelProps {
	open: boolean;
	/** Which sheet it rises as. */
	sheet: SheetKind;
	/** What a screen reader calls it. */
	label: string;
	onClose: () => void;
	children: ReactNode;
}

export function ChromePanel({
	open,
	sheet,
	label,
	onClose,
	children,
}: ChromePanelProps) {
	return (
		<PhoneSheet
			open={open}
			onOpenChange={(next) => !next && onClose()}
			kind={sheet}
			label={label}
		>
			{children}
		</PhoneSheet>
	);
}

/** The strip across the top of a panel: whatever names it, then the way out. */
export function ChromePanelHeader({
	children,
	closeLabel,
	onClose,
}: {
	children: ReactNode;
	closeLabel: string;
	onClose: () => void;
}) {
	return (
		<div className="flex shrink-0 items-center gap-2 p-2.5 pb-1.5">
			{children}
			<Button
				variant="ghost"
				size="icon-lg"
				aria-label={closeLabel}
				onClick={onClose}
				className="size-10 rounded-xl text-muted-foreground"
			>
				<XIcon />
			</Button>
		</div>
	);
}
