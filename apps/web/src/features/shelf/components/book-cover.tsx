// A book's cover, or the one we bind it in.

import { cn } from "@registrum/ui/lib/utils";
import { useState } from "react";
import type { BookRecord } from "@/features/shelf/types";
import { coverUrl } from "@/features/shelf/urls";

/** The cloths a coverless book is bound in. */
const CLOTH = [
	"#2c3e63",
	"#71302c",
	"#3f5240",
	"#8a5a1c",
	"#443a5c",
	"#1f3b45",
	"#7a3b52",
	"#55503f",
	"#2b2f36",
	"#6a4b2a",
	"#3d4a6b",
	"#5a3550",
] as const;

/** Which cloth this book is bound in. */
export function clothColor(id: string): string {
	let hash = 0;
	for (let index = 0; index < id.length; index += 1) {
		hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
	}
	return CLOTH[hash % CLOTH.length] ?? CLOTH[0];
}

/**
 * A book's cover wherever it appears — the shelf, a table row, the detail
 * screen — at whatever size the caller asks for.
 */
export function BookCover({
	book,
	className,
	showFallbackTitle = true,
}: {
	book: BookRecord;
	className?: string;
	/** Off where the frame is too small to hold words (the table's 26px column). */
	showFallbackTitle?: boolean;
}) {
	const [failed, setFailed] = useState(false);
	const url = coverUrl(book);

	return (
		<div
			className={cn(
				"@container relative aspect-3/4 overflow-hidden rounded-lg bg-muted",
				"ring-1 ring-black/10 ring-inset dark:ring-white/10",
				className,
			)}
		>
			{url && !failed ? (
				<img
					src={url}
					alt=""
					loading="lazy"
					decoding="async"
					onError={() => setFailed(true)}
					// Positioned, not sized: inside a table cell a percentage height is
					// measured against the table, not against this box.
					className="absolute inset-0 h-full w-full object-cover"
				/>
			) : (
				<div
					className="absolute inset-0 flex justify-end p-[7%]"
					style={{ background: clothColor(book.id) }}
				>
					{showFallbackTitle && (
						<>
							<span
								className="max-h-full overflow-hidden font-serif text-[#f3efe6] leading-none tracking-[0.12em] [writing-mode:vertical-rl]"
								style={{ fontSize: "8.5cqw" }}
							>
								{book.title}
							</span>
							{book.authors.length > 0 && (
								<span
									className="absolute inset-x-[7%] bottom-[6%] truncate text-[#f3efe6]/75"
									style={{ fontSize: "5cqw" }}
								>
									{book.authors[0]}
								</span>
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
}
