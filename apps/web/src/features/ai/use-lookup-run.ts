// Books looked up in Google Books one after another, from the screen's side.

import { useCallback, useEffect, useRef, useState } from "react";

import type { BookRecord } from "@/features/shelf/types";
import { currentLocale } from "@/i18n";
import { api } from "@/lib/api";
import { randomId } from "@/lib/random-id";
import { asFailure, failureMessage } from "@/store/alert";
import type { Lookup, Usage } from "./types";

export type LookupState =
	| { status: "waiting" }
	| { status: "running" }
	| { status: "done"; lookup: Lookup; usage: Usage }
	| { status: "failed"; message: string };

interface LookupRun {
	states: Record<string, LookupState>;
	running: boolean;
	/** Looks up every book that has no answer yet. */
	resume: () => void;
	stop: () => void;
}

/**
 * One book at a time: every lookup is a model call, and a run that has started
 * failing -- Google's quota spent, the endpoint down -- stops rather than
 * paying for the same failure once a book.
 */
interface Loop {
	stopped: boolean;
	/** The call that is out, which the stop button names. */
	out: string | null;
}

export function useLookupRun(
	shelfId: string,
	books: readonly BookRecord[],
	open: boolean,
): LookupRun {
	const [states, setStates] = useState<Record<string, LookupState>>({});
	const [running, setRunning] = useState(false);
	/** The loop that is going. One that has been replaced says nothing more. */
	const current = useRef<Loop | null>(null);
	const statesRef = useRef(states);
	statesRef.current = states;
	// Read when a run starts, not watched: a new array of the same books is not
	// a reason to ask again, and every ask is a call to pay for.
	const booksRef = useRef(books);
	booksRef.current = books;

	const stop = useCallback(() => {
		const loop = current.current;
		if (!loop) return;
		loop.stopped = true;
		if (loop.out) void api.ai.stop.mutate({ runId: loop.out });
	}, []);

	const start = useCallback(() => {
		const left = booksRef.current.filter(
			(book) => statesRef.current[book.id]?.status !== "done",
		);
		if (!left.length) return;
		const loop: Loop = { stopped: false, out: null };
		current.current = loop;
		const set = (id: string, state: LookupState) => {
			if (current.current === loop)
				setStates((now) => ({ ...now, [id]: state }));
		};
		setRunning(true);
		for (const book of left) set(book.id, { status: "waiting" });

		void (async () => {
			// A beat before the first call, so a loop stopped as soon as it was
			// started -- an effect run twice -- sends nothing.
			await Promise.resolve();
			for (const book of left) {
				if (loop.stopped) break;
				const runId = randomId();
				loop.out = runId;
				set(book.id, { status: "running" });
				try {
					const answered = await api.ai.lookup.mutate({
						shelfId,
						id: book.id,
						locale: currentLocale(),
						runId,
					});
					set(book.id, {
						status: "done",
						lookup: answered.value,
						usage: answered.usage,
					});
				} catch (error) {
					set(
						book.id,
						asFailure(error)?.code === "aiStopped"
							? { status: "waiting" }
							: {
									status: "failed",
									message: failureMessage(error, String(error)),
								},
					);
					break;
				}
			}
			loop.out = null;
			if (current.current === loop) setRunning(false);
		})();
	}, [shelfId]);

	// Opening is the act of asking. Each opening starts over, and a dialog
	// closed while a call is out has nobody to show the answer to.
	useEffect(() => {
		if (!open) return;
		statesRef.current = {};
		setStates({});
		start();
		return stop;
	}, [open, start, stop]);

	return { states, running, resume: start, stop };
}
