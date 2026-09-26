// A name that opens its own sheet.

import { cn } from "@Registrum/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import type { NameKind } from "@/features/library/types";

/** Inline, so a line too narrow for its names still ends in an ellipsis. */
export function NameLink({
	kind,
	name,
	from,
	className,
}: {
	kind: NameKind;
	name: string;
	/** The book whose sheet this is pressed on, which closing the name returns to. */
	from?: string;
	className?: string;
}) {
	const { t } = useTranslation();

	return (
		<Link
			to="/name"
			search={{ kind, name, from }}
			aria-label={t("name.open", { name })}
			className={cn(
				"inline rounded-xs text-left underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:underline",
				className,
			)}
		>
			{name}
		</Link>
	);
}

/** Several names of one kind, each its own link. */
export function NameLinks({
	kind,
	names,
	from,
	separator,
}: {
	kind: NameKind;
	names: string[];
	from?: string;
	separator: string;
}) {
	return (
		<>
			{names.map((name, index) => (
				<Fragment key={name}>
					{index > 0 && separator}
					<NameLink kind={kind} name={name} from={from} />
				</Fragment>
			))}
		</>
	);
}

/** A series and its volume, the series being the link: `シリーズ名 3`. */
export function SeriesLink({
	series,
	index,
	from,
}: {
	series: string;
	index: number | null;
	from?: string;
}) {
	return (
		<>
			<NameLink kind="series" name={series} from={from} />
			{index !== null && ` ${index}`}
		</>
	);
}
