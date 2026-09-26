// Paths the library keeps: relative, `/`-separated, and never able to climb out
// of the folder they are relative to.

import { isAbsolute, posix, relative, resolve } from "node:path";

import { Failure } from "../failure";

/**
 * A relative path as the library writes it down, or a failure for one that
 * could reach outside the folder it is relative to. The empty string is the
 * folder itself.
 */
export function safeRelative(path: string): string {
	const slashed = path.replaceAll("\\", "/").trim();
	if (slashed.startsWith("/") || /^[a-zA-Z]:/.test(slashed))
		throw new Failure("badPath", path);
	const parts = slashed
		.split("/")
		.filter((part) => part !== "" && part !== ".");
	if (parts.some((part) => part === ".." || part.includes("\0")))
		throw new Failure("badPath", path);
	return parts.join("/");
}

/** `relative` under `root`, checked to still be under it. */
export function inside(root: string, relativePath: string): string {
	const at = resolve(root, safeRelative(relativePath));
	const back = relative(root, at);
	if (back.startsWith("..") || isAbsolute(back))
		throw new Failure("badPath", relativePath);
	return at;
}

/** Joins two relative paths the way the library spells them. */
export function joinRelative(at: string, name: string): string {
	return at === "" ? name : `${at}/${name}`;
}

/** The last part of a `/`-separated path: a file's own name. */
export function fileName(path: string): string {
	return posix.basename(path);
}

/** A file's own name without its extension, which is the honest title for the
 *  formats that do not carry one. A name that is all extension (`.hidden`)
 *  is kept whole. */
export function fileStem(path: string): string {
	return posix.parse(path).name;
}
