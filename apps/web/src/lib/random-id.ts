/** `crypto.randomUUID` is missing outside a secure context, such as a page
 *  served over plain HTTP to another device; `getRandomValues` is not. */
export function randomId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
