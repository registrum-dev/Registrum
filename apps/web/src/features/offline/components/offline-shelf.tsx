// The shelf while the server is not answering: the books saved here.

import { Button } from "@registrum/ui/components/button";
import { useNavigate } from "@tanstack/react-router";
import { CloudOffIcon, RefreshCwIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSavedBooks } from "@/features/offline/queries";
import { ShelfUnopened } from "@/features/shelf/components/shelf-empty";
import { ShelfGrid } from "@/features/shelf/components/shelf-grid";
import { readLink } from "@/features/shelf/links";
import { useShelfStore } from "@/features/shelf/store";
import type { BookRecord } from "@/features/shelf/types";

export function OfflineShelf({
	className,
	onRetry,
}: {
	className?: string;
	onRetry: () => void;
}) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const saved = useSavedBooks();
	const shelfId = useShelfStore((state) => state.shelfId);

	if (saved.isLoading) return null;
	const books = saved.data ?? [];
	if (books.length === 0) return <ShelfUnopened onRetry={onRetry} />;

	// The book's screen needs the server, so either press opens the reader.
	const open = (record: BookRecord) => {
		const found = books.find((book) => book.record.id === record.id);
		// Its position is written to the shelf it is on.
		if (found && found.shelfId !== shelfId) {
			void useShelfStore.getState().switchTo(found.shelfId);
		}
		void navigate(readLink(record.id));
	};

	return (
		<div className={className}>
			<div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm">
				<CloudOffIcon className="size-4 shrink-0 text-muted-foreground" />
				<p className="min-w-0 flex-1 text-muted-foreground">
					{t("offline.shelfDescription")}
				</p>
				<Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
					<RefreshCwIcon />
					{t("offline.retry")}
				</Button>
			</div>
			<ShelfGrid
				books={books.map((book) => book.record)}
				sort="lastOpened"
				order="desc"
				page={0}
				onOpenDetail={open}
				onOpenReader={open}
			/>
		</div>
	);
}
