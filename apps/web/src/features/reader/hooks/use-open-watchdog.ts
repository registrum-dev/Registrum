// Watching for a book that never finishes opening.

import { useEffect, useEffectEvent } from "react";

import { t } from "@/i18n";
import { describeError } from "@/store/alert";

/**
 * Chromium reports a ResizeObserver that needed another pass as a window error.
 * It is a diagnostic, not a failure — layouts that settle on the second frame
 * are normal — and the watchdog below must not mistake it for a book that
 * refused to open.
 */
const HARMLESS_ERROR = /^ResizeObserver loop/;

/** How long a book may take to open before the reader is told it is stuck. */
const SLOW_OPEN_MS = 60_000;

/**
 * An exception inside foliate-js leaves its promises unsettled, so a load that
 * never finishes has to be watched for.
 */
export function useOpenWatchdog(
	loading: boolean,
	onFailed: (message: string) => void,
) {
	// Called from the listeners so a new closure does not restart the timer.
	const fail = useEffectEvent(onFailed);

	useEffect(() => {
		if (!loading) return;

		const onError = (event: ErrorEvent) => {
			if (HARMLESS_ERROR.test(event.message)) return;
			fail(t("reader.openBookFailed", { message: event.message }));
		};
		const onRejection = (event: PromiseRejectionEvent) => {
			fail(
				t("reader.openBookFailed", { message: describeError(event.reason) }),
			);
		};
		const slow = setTimeout(() => fail(t("reader.stillLoading")), SLOW_OPEN_MS);

		const listening = new AbortController();
		const { signal } = listening;
		window.addEventListener("error", onError, { signal });
		window.addEventListener("unhandledrejection", onRejection, { signal });
		return () => {
			clearTimeout(slow);
			listening.abort();
		};
	}, [loading]);
}
