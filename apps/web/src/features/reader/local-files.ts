// Files the reader dropped on the window or picked with Ctrl+O. They never go
// to the server: the browser reads them where they are, and holds them for as
// long as the tab is open.

const held = new Map<string, File>();

/** Keeps a file for the reader and hands back the token its URL carries. */
export function holdFile(file: File): string {
	const token = crypto.randomUUID();
	held.set(token, file);
	return token;
}

/** The file behind a token, or `undefined` once the tab has let it go -- a
 *  reload, or a link opened in another tab. */
export function heldFile(token: string): File | undefined {
	return held.get(token);
}
