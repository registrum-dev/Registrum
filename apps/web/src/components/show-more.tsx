// A long list drawn a step at a time.

import { Button } from "@registrum/ui/components/button";
import { cn } from "@registrum/ui/lib/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * How many of a long list are drawn: `step` at first, `step` more each time
 * asked. It starts over whenever `at` -- what the list is of -- changes.
 */
export function useShownCount(step: number, at: string) {
	const [shown, setShown] = useState({ at, count: step });
	const count = shown.at === at ? shown.count : step;
	return [count, () => setShown({ at, count: count + step })] as const;
}

/** The button under the part drawn so far. */
export function ShowMore({
	count,
	disabled,
	onClick,
	className,
}: {
	/** How many the next step draws. */
	count: number;
	disabled?: boolean;
	onClick: () => void;
	className?: string;
}) {
	const { t } = useTranslation();
	return (
		<Button
			variant="ghost"
			size="sm"
			disabled={disabled}
			onClick={onClick}
			className={cn("self-center rounded-lg text-muted-foreground", className)}
		>
			{t("common.showMore", { count })}
		</Button>
	);
}
