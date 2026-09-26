// The reader's route.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ReaderPage } from "@/features/reader/components/reader-page";

/** What `/read` needs to know to put a book on screen. Anything else in the URL
 *  is dropped rather than refused. */
const readerSearch = z.object({
	/** A book in the library. Carries a reading position. */
	id: z.string().optional().catch(undefined),
	/** A file opened from outside it -- dropped, or picked with Ctrl+O -- by the
	 *  token the tab holds it under. */
	file: z.string().optional().catch(undefined),
	/**
	 * Where the way out goes. A book opened from its detail screen returns there;
	 * one opened from the shelf or dropped on the window returns to the shelf.
	 * Carried in the URL rather than read back out of the history, because a
	 * reload can start the app on the reader.
	 */
	from: z.literal("book").optional().catch(undefined),
});

export type ReaderSearch = z.output<typeof readerSearch>;

export const Route = createFileRoute("/_shelf/read")({
	component: ReaderRoute,
	validateSearch: readerSearch,
});

function ReaderRoute() {
	const { id, file, from } = Route.useSearch();
	return <ReaderPage id={id} file={file} from={from} />;
}
