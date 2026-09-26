import { z } from "zod";

/** A call about one shelf. */
export const onShelf = z.object({ shelfId: z.string() });

/** A call about one book, which must be on that shelf. */
export const oneBook = onShelf.extend({ id: z.string() });
