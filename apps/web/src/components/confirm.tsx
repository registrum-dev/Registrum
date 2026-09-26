// A dialog on a desktop, a menu risen from the bottom on a phone.

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@Registrum/ui/components/alert-dialog";
import { Button } from "@Registrum/ui/components/button";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { PhoneSheet } from "@/components/phone-sheet";
import { useLayout } from "@/hooks/use-layout";

/** The pause before something that cannot be undone. */
export function Confirm({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel,
	destructive = true,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: ReactNode;
	description: ReactNode;
	confirmLabel: string;
	/** Off for the ones that only cost work, not data. */
	destructive?: boolean;
	onConfirm: () => void;
}) {
	const { t } = useTranslation();
	const phone = useLayout() === "phone";

	if (phone) {
		return (
			<PhoneSheet
				open={open}
				onOpenChange={onOpenChange}
				kind="fit"
				label={typeof title === "string" ? title : confirmLabel}
			>
				<div className="flex flex-col gap-4 px-5 pt-1.5 pb-4 text-center">
					<div className="flex flex-col gap-2">
						<h2 className="font-semibold text-base">{title}</h2>
						<p className="text-muted-foreground text-sm leading-relaxed">
							{description}
						</p>
					</div>
					<div className="flex flex-col gap-2">
						<Button
							size="lg"
							variant={destructive ? "destructive" : "default"}
							onClick={onConfirm}
							className="h-12 rounded-xl text-[15px]"
						>
							{confirmLabel}
						</Button>
						<Button
							size="lg"
							variant="secondary"
							onClick={() => onOpenChange(false)}
							className="h-12 rounded-xl text-[15px]"
						>
							{t("common.cancel")}
						</Button>
					</div>
				</div>
			</PhoneSheet>
		);
	}

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
					<AlertDialogAction
						variant={destructive ? "destructive" : "default"}
						onClick={onConfirm}
					>
						{confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
