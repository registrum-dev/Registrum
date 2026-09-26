// What the keyboard belongs to when a key is pressed.

/** Keys typed into one of these belong to it, not to the app or the book. */
const EDITABLE = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** Whether the key that arrived was typed into a field. */
export function isTyping(event: KeyboardEvent): boolean {
	const target = event.target as HTMLElement | null;
	return target !== null && EDITABLE.has(target.tagName);
}
