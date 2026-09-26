// A dialog on a desktop, a sheet on a phone.

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@Registrum/ui/components/dialog";
import { cn } from "@Registrum/ui/lib/utils";
import type { ReactNode } from "react";
import {
	PhoneSheet,
	SheetBar,
	SheetBody,
	SheetDock,
	type SheetKind,
} from "@/components/phone-sheet";
import { useLayout } from "@/hooks/use-layout";

interface AdaptiveDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: ReactNode;
	children: ReactNode;
	/** The dialog's row of buttons. On a phone it docks at the foot unless `trailing` stands in for it. */
	footer?: ReactNode;
	/** The dialog's own box, on a desktop. */
	className?: string;
	/** Which sheet it is on a phone. */
	kind?: SheetKind;
	/** On a phone: what stands either side of the title. Without `trailing` there is a close button. */
	leading?: ReactNode;
	trailing?: ReactNode;
	/** On a phone: what docks at the foot, where it differs from `footer`. */
	dock?: ReactNode;
	/** On a phone: the body's own box. */
	bodyClassName?: string;
}

export function AdaptiveDialog({
	open,
	onOpenChange,
	title,
	description,
	children,
	footer,
	className,
	kind = "page",
	leading,
	trailing,
	dock,
	bodyClassName,
}: AdaptiveDialogProps) {
	const phone = useLayout() === "phone";

	if (phone) {
		const foot = dock ?? (trailing ? undefined : footer);
		return (
			<PhoneSheet
				open={open}
				onOpenChange={onOpenChange}
				kind={kind}
				label={title}
			>
				<SheetBar
					leading={leading}
					title={title}
					trailing={trailing}
					onClose={() => onOpenChange(false)}
				/>
				<SheetBody
					className={cn(
						"flex flex-col gap-4",
						kind === "fit" && "flex-initial",
						bodyClassName,
					)}
				>
					{description && (
						<p className="text-muted-foreground text-sm">{description}</p>
					)}
					{children}
				</SheetBody>
				{foot && (
					<SheetDock className="flex flex-wrap justify-end gap-2">
						{foot}
					</SheetDock>
				)}
			</PhoneSheet>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className={className}>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>
				{children}
				{footer && <DialogFooter>{footer}</DialogFooter>}
			</DialogContent>
		</Dialog>
	);
}
