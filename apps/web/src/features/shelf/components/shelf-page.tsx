// The shelf.

import { ScrollArea } from "@registrum/ui/components/scroll-area";
import { Spinner } from "@registrum/ui/components/spinner";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Presence } from "@/components/presence";
import { BookPager } from "@/features/shelf/components/book-pager";
import { BookTable } from "@/features/shelf/components/book-table";
import { ScreenFrame } from "@/features/shelf/components/screen-frame";
import {
	ShelfEmpty,
	ShelfUnopened,
} from "@/features/shelf/components/shelf-empty";
import { ShelfGrid } from "@/features/shelf/components/shelf-grid";
import { ShelfSetup } from "@/features/shelf/components/shelf-setup";
import { ShelfToolbar } from "@/features/shelf/components/shelf-toolbar";
import { isFiltered } from "@/features/shelf/filter";
import { useOpenBook } from "@/features/shelf/hooks/use-open-book";
import { bookLink, readLink } from "@/features/shelf/links";
import { lastPage } from "@/features/shelf/paging";
import { useFacets, useShelfBooks } from "@/features/shelf/queries";
import { useShelfStore } from "@/features/shelf/store";
import { type BookRecord, NO_BOOKS } from "@/features/shelf/types";
import { useWindowTitle } from "@/hooks/use-window-title";

/** The shelf's frame in either view: the books, then the pager under them. */
const FACE =
	"motion-leave-rise flex flex-col gap-5 phone:gap-4 p-5 phone:p-3 pb-[calc(1.25rem+var(--safe-bottom))] phone:pb-[calc(0.75rem+var(--safe-bottom))]";

/**
 * The shelf. Every book its folder was found to hold, in whichever of the two
 * views the reader left it in.
 */
export function ShelfPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { pickAndOpen } = useOpenBook();
	const openFile = () => void pickAndOpen();

	const shelfId = useShelfStore((state) => state.shelfId);
	const filter = useShelfStore((state) => state.filter);
	const sort = useShelfStore((state) => state.sort);
	const order = useShelfStore((state) => state.order);
	const view = useShelfStore((state) => state.view);
	const page = useShelfStore((state) => state.page);
	const pageSize = useShelfStore((state) => state.pageSize);
	const busy = useShelfStore((state) => state.busy);
	const walked = useShelfStore((state) => state.walked);
	const openFailed = useShelfStore((state) => state.openFailed);
	const load = useShelfStore((state) => state.load);
	const startScan = useShelfStore((state) => state.startScan);
	const clearFilter = useShelfStore((state) => state.clearFilter);
	const setPage = useShelfStore((state) => state.setPage);
	const setPageSize = useShelfStore((state) => state.setPageSize);
	const facets = useFacets();

	const shelf = useShelfBooks();
	const books = shelf.data?.books ?? NO_BOOKS;
	/** Everything the conditions let through, of which the shelf is one page. */
	const total = shelf.data?.total ?? 0;
	const last = lastPage(total, pageSize);
	// Held, so the bar does not read "0" under the spinner.
	const [counted, setCounted] = useState(total);
	if (shelf.data && counted !== total) setCounted(total);
	useWindowTitle(t("app.name"));

	// Books leave -- deleted, or a scan that found fewer -- and the page the
	// reader is standing on can stop existing under them.
	useEffect(() => {
		if (page > last) setPage(last);
	}, [page, last, setPage]);

	// A page turned at the foot of the shelf would otherwise arrive at the foot
	// of the next one, which is not where it starts.
	const viewport = useRef<HTMLDivElement>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: a page turn is what it runs on.
	useEffect(() => {
		viewport.current?.scrollTo({ top: 0 });
	}, [page]);

	const openDetail = useCallback(
		(book: BookRecord) => void navigate(bookLink(book.id)),
		[navigate],
	);
	const openReader = useCallback(
		(book: BookRecord) => void navigate(readLink(book.id)),
		[navigate],
	);

	if (!shelfId) return <ShelfSetup />;

	const pager = last > 0 && (
		<BookPager
			page={page}
			size={pageSize}
			total={total}
			onPageChange={setPage}
			onSizeChange={setPageSize}
		/>
	);

	return (
		<ScreenFrame>
			<ShelfToolbar shown={counted} onOpenFile={openFile} />

			<ScrollArea viewportRef={viewport} className="min-h-0 flex-1">
				{/* Nothing yet is not "no books". */}
				{shelf.isPending ? (
					openFailed ? (
						<ShelfUnopened onRetry={() => void load()} />
					) : (
						<div className="flex h-full min-h-100 items-center justify-center">
							<Spinner aria-label={t("common.loading")} />
						</div>
					)
				) : (
					<div className="h-full">
						{/* Only the leaving side animates. */}
						<Presence>
							{view === "table" && total > 0 ? (
								<div key="table" className={FACE}>
									<BookTable
										books={books}
										onOpenDetail={openDetail}
										onOpenReader={openReader}
									/>
									{pager}
								</div>
							) : total === 0 ? (
								<div key="empty" className="motion-leave-fade h-full">
									<ShelfEmpty
										scanning={busy === "scanning"}
										scanned={walked}
										filtered={isFiltered(filter) && facets.total > 0}
										onClearQuery={clearFilter}
										onScan={() => void startScan()}
										onOpenFile={openFile}
									/>
								</div>
							) : (
								<div key="grid" className={FACE}>
									<ShelfGrid
										books={books}
										sort={sort}
										order={order}
										page={page}
										onOpenDetail={openDetail}
										onOpenReader={openReader}
									/>
									{pager}
								</div>
							)}
						</Presence>
					</div>
				)}
			</ScrollArea>
		</ScreenFrame>
	);
}
