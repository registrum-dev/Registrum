// A name that opens its own sheet.

import { cn } from "@registrum/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import type { FacetKind } from "@/features/shelf/types";

/** Inline, so a line too narrow for its names still ends in an ellipsis. */
export function FacetLink({
	kind,
	name,
	from,
	className,
}: {
	kind: FacetKind;
	name: string;
	/** The book whose sheet this is pressed on, which closing the name returns to. */
	from?: string;
	className?: string;
}) {
	const { t } = useTranslation();

	return (
		<Link
			to="/facet"
			search={{ kind, value: name, from }}
			aria-label={t("facet.open", { name })}
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
export function FacetLinks({
	kind,
	names,
	from,
	separator,
}: {
	kind: FacetKind;
	names: string[];
	from?: string;
	separator: string;
}) {
	return (
		<>
			{names.map((name, index) => (
				<Fragment key={name}>
					{index > 0 && separator}
					<FacetLink kind={kind} name={name} from={from} />
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
			<FacetLink kind="series" name={series} from={from} />
			{index !== null && ` ${index}`}
		</>
	);
}
