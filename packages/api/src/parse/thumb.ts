// A cover, as the thumbnail the shelf draws.

import sharp from "sharp";

/** Long edge of the stored thumbnail; twice the grid cell, so it stays sharp on
 *  a HiDPI screen. */
const MAX_EDGE = 512;
const QUALITY = 82;

/** The WebP bytes, or `null` when nothing readable came back. */
export async function encodeCover(bytes: Buffer): Promise<Buffer | null> {
	try {
		return await sharp(bytes, { failOn: "none", limitInputPixels: 268_402_689 })
			.resize(MAX_EDGE, MAX_EDGE, {
				fit: "inside",
				withoutEnlargement: true,
				kernel: "lanczos3",
			})
			.webp({ quality: QUALITY })
			.toBuffer();
	} catch {
		// A cover is a nicety. A book whose cover will not decode is still a
		// book, and gets a placeholder on the shelf.
		return null;
	}
}
