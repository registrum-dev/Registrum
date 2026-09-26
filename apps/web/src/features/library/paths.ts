// Just enough path arithmetic for the library.

/** Last segment of a path, with the extension left on. */
export function baseName(path: string): string {
	return path.split(/[\\/]/).pop() ?? path;
}
