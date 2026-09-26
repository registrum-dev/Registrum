// The files the browser reads directly rather than through tRPC: thumbnails,
// book files and comic pages.

import { Failure } from "@Registrum/api/failure";
import { coverDir, coverFile } from "@Registrum/api/library/covers";
import { bookFile, comicPage } from "@Registrum/api/library/files";
import type { BookFormat } from "@Registrum/api/vocabulary";
import { join } from "node:path";
import type { Context } from "hono";

import { config, db } from "./services";

const BOOK_TYPES: Record<BookFormat, string> = {
	epub: "application/epub+zip",
	pdf: "application/pdf",
	cbz: "application/vnd.comicbook+zip",
	zip: "application/zip",
};

function failed(c: Context, error: unknown) {
	if (error instanceof Failure) {
		const status =
			error.code === "noBook" ||
			error.code === "badId" ||
			error.code === "badPath"
				? 404
				: 500;
		return c.json({ code: error.code, detail: error.detail }, status);
	}
	console.error(error);
	return c.json({ code: "readBook", detail: String(error) }, 500);
}

/** A thumbnail. The URL carries the record's `indexedAt`, so what is served
 *  under it never changes. */
export async function cover(c: Context) {
	try {
		const path = join(coverDir(config), coverFile(c.req.param("id") ?? ""));
		const file = Bun.file(path);
		if (!(await file.exists())) return c.body(null, 404);
		// Handed to Bun as the file itself, so it is sent straight from disk with
		// its length and its type (from the `.webp` name) filled in.
		return new Response(file, {
			headers: { "cache-control": "public, max-age=31536000, immutable" },
		});
	} catch (error) {
		return failed(c, error);
	}
}

/** A book's file, in whole or by range. */
export async function book(c: Context) {
	try {
		const found = await bookFile(db, config, c.req.param("id") ?? "");
		const file = Bun.file(found.path);
		if (!(await file.exists())) throw new Failure("readBook", found.name);
		const size = file.size;
		const headers: Record<string, string> = {
			"content-type": BOOK_TYPES[found.format],
			"accept-ranges": "bytes",
			"content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(found.name)}`,
			"cache-control": "private, no-cache",
		};

		const range = /^bytes=(\d*)-(\d*)$/.exec(c.req.header("range") ?? "");
		if (range && (range[1] || range[2])) {
			const start = range[1]
				? Number(range[1])
				: Math.max(0, size - Number(range[2]));
			const end =
				range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
			if (start > end || start >= size) {
				return c.body(null, 416, { "content-range": `bytes */${size}` });
			}
			// A slice of the file rather than a stream of it, so Bun sends it from
			// disk. The length is written out all the same: the CORS middleware
			// rebuilds the response as a stream and would drop it.
			return new Response(file.slice(start, end + 1), {
				status: 206,
				headers: {
					...headers,
					"content-range": `bytes ${start}-${end}/${size}`,
					"content-length": String(end - start + 1),
				},
			});
		}
		return new Response(file, {
			headers: { ...headers, "content-length": String(size) },
		});
	} catch (error) {
		return failed(c, error);
	}
}

/** One page of a comic the reader has open. */
export async function page(c: Context) {
	try {
		const index = Number(c.req.param("page"));
		const found = await comicPage(
			c.req.param("key") ?? "",
			Number.isInteger(index) ? index : -1,
		);
		return c.body(found.bytes, 200, {
			"content-type": found.type,
			"cache-control": "private, max-age=3600",
		});
	} catch (error) {
		return failed(c, error);
	}
}
