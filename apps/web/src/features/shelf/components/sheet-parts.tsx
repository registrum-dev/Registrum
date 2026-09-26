// The pieces the shelf's page sheets -- a book, a name -- are built from.

import { Button } from "@registrum/ui/components/button";
import { Separator } from "@registrum/ui/components/separator";
import { Spinner } from "@registrum/ui/components/spinner";
import { XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/** The sheet's bar: the way back to the shelf, what the sheet is, and on the
 *  right whatever else it offers. */
export function SheetHeader({
	label,
	onClose,
	children,
}: {
	label: string;
	onClose: () => void;
	children?: ReactNode;
}) {
	const { t } = useTranslation();

	return (
		<header className="chrome z-20 flex h-12 shrink-0 items-center gap-1.5 border-border border-b px-3">
			<Button
				variant="ghost"
				size="icon"
				aria-label={t("common.close")}
				onClick={onClose}
				className="rounded-xl text-muted-foreground"
			>
				<XIcon />
			</Button>

			<Separator orientation="vertical" className="mx-1 phone:hidden h-4" />
			<span className="truncate text-muted-foreground text-sm">{label}</span>

			{children}
		</header>
	);
}

/** Nothing to draw yet: the app is still waking up. */
export function SheetLoading() {
	const { t } = useTranslation();

	return (
		<div className="flex h-full w-full items-center justify-center">
			<Spinner aria-label={t("common.loading")} />
		</div>
	);
}
