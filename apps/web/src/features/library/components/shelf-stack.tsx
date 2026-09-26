// The shelf with what was opened from it laid over it.

import { cn } from "@Registrum/ui/lib/utils";
import { type ReactNode, useEffect, useRef } from "react";
import { BookSheet } from "@/features/library/components/book-detail/book-sheet";
import { LibraryPage } from "@/features/library/components/library-page";
import { SettingsSheet } from "@/features/library/components/library-settings";
import {
	type NameAddress,
	NameSheet,
} from "@/features/library/components/name-sheet";
import { RuleSheet } from "@/features/rule/components/rule-sheet";
import { aboveStyle, useShelfAbove } from "@/lib/sheet-stack";

/**
 * The shelf, the sheets the router opens over it, and the reader over all of
 * them. The shelf stays mounted underneath, so a sheet pulled down shows it
 * where it was left.
 */
export function ShelfStack({
	book,
	bookId,
	name,
	settings,
	rule,
	covered,
	children,
}: {
	/** Whether the book's sheet is up. */
	book: boolean;
	bookId: string | undefined;
	/** The name whose sheet is up, if one is. */
	name: NameAddress | undefined;
	/** Whether the settings sheet is up. */
	settings: boolean;
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
				inert={book || Boolean(name) || settings || rule || covered}
				style={aboveStyle(above)}
				className={cn(
					"h-full w-full overflow-hidden bg-background",
					above && "screen-stepped",
				)}
			>
				<LibraryPage />
			</div>

			<div className="relative z-20">
				<div inert={Boolean(name)}>
					<BookSheet open={book} id={bookId} appear={arrived.current} />
				</div>
				<NameSheet
					open={Boolean(name)}
					address={name ?? {}}
					appear={arrived.current}
				/>
				<SettingsSheet open={settings} appear={arrived.current} />
				<RuleSheet open={rule} appear={arrived.current} />
			</div>

			{children}
		</div>
	);
}
