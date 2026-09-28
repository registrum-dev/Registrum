// The shelf with what was opened from it laid over it.

import { cn } from "@registrum/ui/lib/utils";
import { type ReactNode, useEffect, useRef } from "react";
import { RuleSheet } from "@/features/rule/components/rule-sheet";
import { BookSheet } from "@/features/shelf/components/book-detail/book-sheet";
import {
	type FacetAddress,
	FacetSheet,
} from "@/features/shelf/components/facet-sheet";
import { NamesSheet } from "@/features/shelf/components/names-sheet";
import { SettingsSheet } from "@/features/shelf/components/settings-sheet";
import { ShelfPage } from "@/features/shelf/components/shelf-page";
import type { FacetKind } from "@/features/shelf/types";
import { aboveStyle, useShelfAbove } from "@/lib/sheet-stack";

/**
 * The shelf, the sheets the router opens over it, and the reader over all of
 * them. The shelf stays mounted underneath, so a sheet pulled down shows it
 * where it was left.
 */
export function ShelfStack({
	book,
	bookId,
	facet,
	settings,
	names,
	rule,
	covered,
	children,
}: {
	/** Whether the book's sheet is up. */
	book: boolean;
	bookId: string | undefined;
	/** The name whose sheet is up, if one is. */
	facet: FacetAddress | undefined;
	/** Whether the settings sheet is up. */
	settings: boolean;
	/** The kind of name the list is showing, when it is up. */
	names: { kind?: FacetKind } | undefined;
	/** Whether the path rule is up. */
	rule: boolean;
	/** A screen fills the window over the shelf. */
	covered: boolean;
	children: ReactNode;
}) {
	const above = useShelfAbove();
	// Not played when the stack itself arrives — back from the reader, or the
	// app starting on a book — only when a sheet is asked for.
	const arrived = useRef(false);
	useEffect(() => {
		arrived.current = true;
	}, []);

	return (
		<div className="relative isolate h-full w-full overflow-hidden bg-black">
			<div
				inert={
					book ||
					Boolean(facet) ||
					settings ||
					Boolean(names) ||
					rule ||
					covered
				}
				style={aboveStyle(above)}
				className={cn(
					"h-full w-full overflow-hidden bg-background",
					above && "screen-stepped",
				)}
			>
				<ShelfPage />
			</div>

			<div className="relative z-20">
				<div inert={Boolean(facet)}>
					<BookSheet open={book} id={bookId} appear={arrived.current} />
				</div>
				<FacetSheet
					open={Boolean(facet)}
					address={facet ?? {}}
					appear={arrived.current}
				/>
				<SettingsSheet open={settings} appear={arrived.current} />
				<NamesSheet
					open={Boolean(names)}
					kind={names?.kind}
					appear={arrived.current}
				/>
				<RuleSheet open={rule} appear={arrived.current} />
			</div>

			{children}
		</div>
	);
}
