// One generation, from the screen's side.

import { useMutation } from "@tanstack/react-query";
import { useSubscription } from "@trpc/tanstack-react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { currentLocale, type Locale } from "@/i18n";
import { api, trpc } from "@/lib/api";
import type { Generated, Sent } from "./types";

interface Generation<T> {
	pending: boolean;
	/** How much of the book went, once the server has read it. */
	sent: Sent | null;
	/** How long the call has been out, which is all there is to report. */
	seconds: number;
	result: Generated<T> | null;
	start: () => void;
	stop: () => void;
	clear: () => void;
}

/** Drops the request. Saying so about one that has already answered does
 *  nothing: the answer and the button can cross. */
function stopRun(run: string | null): void {
	if (run) void api.ai.stop.mutate({ run });
}

/**
 * Runs one generation and counts the seconds it takes. It is asked in the
 * language the screen is already in, so that a synopsis reads like the page it
 * will sit on. A failure goes to the banner through the mutation cache; a
 * stopped one is not a failure.
 */
export function useGeneration<T>(
	generate: (run: string, locale: Locale) => Promise<Generated<T>>,
	onDone?: (result: T) => void,
	/** Called when nothing came back, stopping included, so that a screen
	 *  holding something for the answer can put it back. */
	onFailed?: () => void,
): Generation<T> {
	const [sent, setSent] = useState<Sent | null>(null);
	const [seconds, setSeconds] = useState(0);
	// Kept apart from the mutation's own `data`, which a new start or a failure
	// would take away: the last answer stays until another one comes.
	const [result, setResult] = useState<Generated<T> | null>(null);

	/** The generation that is out, which is what a band and the stop button
	 *  both name. An answer to any other is one nobody is waiting for. */
	const running = useRef<string | null>(null);

	// The options are read afresh every render, so the latest `generate`,
	// `onDone` and `onFailed` are the ones called.
	const { mutate, isPending } = useMutation({
		mutationFn: ({ run, locale }: { run: string; locale: Locale }) =>
			generate(run, locale),
		meta: { failure: "aiCall" },
		onSuccess: (answer, { run }) => {
			if (running.current !== run) return;
			setResult(answer);
			onDone?.(answer.value);
		},
		onError: (_error, { run }) => {
			if (running.current === run) onFailed?.();
		},
		onSettled: (_answer, _error, { run }) => {
			if (running.current === run) running.current = null;
		},
	});

	// From the start, not from the button: the server says it as soon as it has
	// read the book.
	useSubscription(
		trpc.ai.sent.subscriptionOptions(undefined, {
			onData: (heard) => {
				if (heard.run === running.current) setSent({ chars: heard.chars });
			},
		}),
	);

	useEffect(() => {
		if (!isPending) return;
		const started = Date.now();
		const timer = setInterval(
			() => setSeconds(Math.floor((Date.now() - started) / 1000)),
			1000,
		);
		return () => clearInterval(timer);
	}, [isPending]);

	// A screen left while the model is still reading has nothing to come back to,
	// and a generation nobody is waiting for is a bill for nothing.
	useEffect(() => () => stopRun(running.current), []);

	const start = useCallback(() => {
		const run = crypto.randomUUID();
		running.current = run;
		setSent(null);
		setSeconds(0);
		mutate({ run, locale: currentLocale() });
	}, [mutate]);

	const stop = useCallback(() => stopRun(running.current), []);
	const clear = useCallback(() => setResult(null), []);

	return { pending: isPending, sent, seconds, result, start, stop, clear };
}
