// Which of the two layouts the window is drawn in.

import { useMediaQuery } from "./use-media-query";

/**
 * Below this width the window is laid out as a phone's: sheets instead of
 * dialogs, the settings stacked instead of swapped. The stylesheet's `phone:` and
 * `desktop:` variants draw the same line (src/app/index.css).
 */
const PHONE_QUERY = "(max-width: 767px)";

export type FormFactor = "phone" | "desktop";

/** The layout the window is in, as a value React can branch on. */
export function useFormFactor(): FormFactor {
	return useMediaQuery(PHONE_QUERY) ? "phone" : "desktop";
}
