// The shelf and the screens opened from it.

import {
	createFileRoute,
	Outlet,
	useMatch,
	useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { ShelfStack } from "@/features/shelf/components/shelf-stack";
import { useSwitchToBookShelf } from "@/features/shelf/queries";
import { useShelfStore } from "@/features/shelf/store";

export const Route = createFileRoute("/_shelf")({ component: ShelfLayout });

/**
 * The shelf stays underneath: the book rises over it as a sheet, the reader
 * over that, and either can be pulled down to show what it was opened from.
 * The settings, the path rule and a name rise as sheets like the book, a name
 * over the book it was opened from.
 */
function ShelfLayout() {
	const book = useMatch({ from: "/_shelf/book", shouldThrow: false });
	const read = useMatch({ from: "/_shelf/read", shouldThrow: false });
	const settings = useMatch({ from: "/_shelf/settings", shouldThrow: false });
	const facet = useMatch({ from: "/_shelf/facet", shouldThrow: false });
	const rule = useMatch({ from: "/_shelf/rule", shouldThrow: false });

	// A link to a book opens on the book's own shelf.
	useSwitchToBookShelf(book?.search.id ?? read?.search.id);

	// The rule is always run over a shelf. With none chosen there is nothing
	// for it to stand over, and the first screen is the one to show.
	const navigate = useNavigate();
	const hydrated = useShelfStore((state) => state.hydrated);
	const shelved = useShelfStore((state) => state.shelfId !== null);
	const ruleless = Boolean(rule) && hydrated && !shelved;
	useEffect(() => {
		if (ruleless) void navigate({ to: "/", replace: true });
	}, [ruleless, navigate]);

	// A book read from its sheet goes back to it, and a name opened from it
	// closes to it, so the sheet waits underneath.
	const fromSheet = read?.search.from === "book";
	const under = fromSheet ? read.search.id : facet?.search.from;
	return (
		<ShelfStack
			book={Boolean(book) || Boolean(under)}
			bookId={book ? book.search.id : under}
			facet={facet?.search}
			settings={Boolean(settings)}
			rule={Boolean(rule) && shelved}
			covered={Boolean(read)}
		>
			<Outlet />
		</ShelfStack>
	);
}
