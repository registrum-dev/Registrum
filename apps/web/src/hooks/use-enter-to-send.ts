// Enter sends, unless it is an IME's confirm key.

import { type KeyboardEvent, useRef } from "react";

/** What to spread on the field that sends on Enter. */
interface EnterToSend {
	onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
	onKeyUp: () => void;
	onBlur: () => void;
	onCompositionEnd: () => void;
}

/**
 * Enter sends, Shift+Enter breaks the line, and the Enter that settles what an
 * IME is converting does neither.
 */
export function useEnterToSend(send: () => void): EnterToSend {
	/** Whether a composition has just ended, so the key that ended it is still
	 *  to come. */
	const settling = useRef(false);

	return {
		onCompositionEnd: () => {
			settling.current = true;
		},
		// The same press that ended the composition, whichever order its events
		// arrived in. Any key going up clears it, so the next Enter is the
		// reader's own.
		onKeyUp: () => {
			settling.current = false;
		},
		onBlur: () => {
			settling.current = false;
		},
		onKeyDown: (event) => {
			if (event.key !== "Enter" || event.shiftKey) return;

			// Chromium and Firefox say so on the keydown itself, because they send
			// it before the composition ends. WebKit ends the composition first, so
			// by here it says nothing and the flag above is what is left.
			const native = event.nativeEvent;
			if (native.isComposing || native.keyCode === 229) return;
			if (settling.current) {
				settling.current = false;
				return;
			}

			event.preventDefault();
			send();
		},
	};
}
