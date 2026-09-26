// Form state that starts over each time its dialog opens.

import { useState } from "react";

/** State set from `init()` whenever `open` turns true; `init` is read then, not
 *  watched. Reset while rendering, so the dialog never draws the last visit's
 *  values first. */
export function useResetOnOpen<T>(open: boolean, init: () => T) {
	const [state, setState] = useState(init);
	const [wasOpen, setWasOpen] = useState(open);
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) setState(init());
	}
	return [state, setState] as const;
}
