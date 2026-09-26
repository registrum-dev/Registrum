import { z } from "zod";

/** A call about one shelf. */
export const shelfInput = z.object({ shelfId: z.string() });

/** A call about one book, which must be on that shelf. */
export const bookInput = shelfInput.extend({ id: z.string() });
