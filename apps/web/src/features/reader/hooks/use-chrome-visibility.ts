import { useCallback, useState } from "react";

export interface ChromeVisibility {
	visible: boolean;
	/** Called from the middle tap zone. Does nothing while the chrome is pinned. */
	toggle: () => void;
}

/** Whether the floating pills and the progress rail are on screen. */
export function useChromeVisibility(pinned: boolean): ChromeVisibility {
	const [hidden, setHidden] = useState(false);

	const toggle = useCallback(() => {
		if (!pinned) setHidden((current) => !current);
	}, [pinned]);

	return { visible: pinned || !hidden, toggle };
}
