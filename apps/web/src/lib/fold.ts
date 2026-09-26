// The form two pieces of text are compared in when a list already on screen is
// narrowed as the reader types. The server's own folding, so the screen and
// the library read `ｶﾀｶﾅ` and `カタカナ` the same way.

import { fold } from "@Registrum/api/lib/fold";

export { fold as foldText };

/** Whether `typed` is in `text`, folded. An empty `typed` is in everything. */
export function foldIncludes(text: string, typed: string): boolean {
	return fold(text).includes(fold(typed));
}
