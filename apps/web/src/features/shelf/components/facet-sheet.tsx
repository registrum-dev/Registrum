// One facet as a sheet over the shelf.

import { Button } from "@registrum/ui/components/button";
import { ScrollArea } from "@registrum/ui/components/scroll-area";
import { Spinner } from "@registrum/ui/components/spinner";
import { useNavigate } from "@tanstack/react-router";
import { LibraryBigIcon, TagsIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { SheetSurface } from "@/components/phone-sheet";
import { ScreenEmpty } from "@/components/screen-empty";
import { ShowMore, useShownCount } from "@/components/show-more";
import { BookCard } from "@/features/shelf/components/book-card";
import { FacetRename } from "@/features/shelf/components/facet-rename";
import {
	SheetHeader,
	SheetLoading,
} from "@/features/shelf/components/sheet-parts";
import { type BookFilter, NO_CONDITIONS } from "@/features/shelf/filter";
import { useRetainedValue } from "@/features/shelf/hooks/use-retained-value";
import { nameKindLabel } from "@/features/shelf/labels";
import { bookLink, readLink } from "@/features/shelf/links";
import { FACET_PAGE, useFacetBooks, useNames } from "@/features/shelf/queries";
import { useShelfStore } from "@/features/shelf/store";
import type { FacetKind } from "@/features/shelf/types";
import { useWindowTitle } from "@/hooks/use-window-title";

export interface FacetAddress {
	kind?: FacetKind;
	value?: string;
	/** The book whose sheet this was opened from. */
	from?: string;
}

/** The name, risen like a book's detail. The router owns its coming and going. */
export function FacetSheet({
	open,
	address,
	appear,
}: {
	open: boolean;
	address: FacetAddress;
	appear: boolean;
}) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	// On its way out the route no longer names it; it leaves showing the last one.
	const shown = useRetainedValue(open, address);
	const { from } = shown;

	const close = useCallback(
		() => void (from ? navigate(bookLink(from)) : navigate({ to: "/" })),
		[navigate, from],
	);

	return (
		<SheetSurface
			open={open}
			kind="page"
			label={t("facet.sheet")}
			modal={false}
			appear={appear}
			onClose={close}
		>
			<NameDetail {...shown} onClose={close} />
		</SheetSurface>
	);
}

/** What the name is called, and what it holds. */
function NameDetail({
	kind,
	value: name,
	from,
	onClose,
}: FacetAddress & { onClose: () => void }) {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const shelfId = useShelfStore((state) => state.shelfId);
	const hydrated = useShelfStore((state) => state.hydrated);
	const setFilter = useShelfStore((state) => state.setFilter);

	// The hooks are asked for whatever the address says; an address that names no
	// name asks for nothing, and the sheet below says so.
	const [pages, more] = useShownCount(1, `${kind}:${name}`);
	const found = useFacetBooks(kind ?? "author", name ?? "", pages);
	const { books, total = 0 } = found;
	const rest = total - pages * FACET_PAGE;
	const listed = useNames(kind ?? "author");
	const held = listed.data ?? [];

	useWindowTitle(name ? `${name} — ${t("app.name")}` : t("app.name"));

	/** Go and stand at this name's shelf, where the whole toolbar is. */
	const standAt = () => {
		if (!kind || !name) return;
		setFilter({ ...NO_CONDITIONS, [kind]: [name] } as BookFilter);
		void navigate({ to: "/" });
	};

	if (!hydrated || !shelfId) {
		return <SheetLoading />;
	}

	// A name stays until it is removed or renamed, whether or not a book
	// carries it.
	if (
		!kind ||
		!name ||
		(listed.isSuccess &&
			!listed.isPlaceholderData &&
			!held.some((entry) => entry.name === name))
	) {
		return (
			<ScreenEmpty
				className="w-full"
				icon={<TagsIcon />}
				title={t("facet.goneTitle")}
				description={t("facet.gone")}
			>
				<Button variant="outline" onClick={onClose}>
					{t(from ? "facet.backToBook" : "shelf.back")}
				</Button>
			</ScreenEmpty>
		);
	}

	// Every other name of this kind: typing one of them is a merge, and the field
	// has to say so before the write rather than after it.
	const taken = held
		.map((entry) => entry.name)
		.filter((entry) => entry !== name);
	// The count the shelf made, which is the one the rail shows. Nothing until
	// it has been made: a shelf that says "0 books" and then fills has told a
	// lie for as long as it was on screen.
	const counted = held.find((entry) => entry.name === name)?.count;

	return (
		<>
			<SheetHeader label={nameKindLabel(kind)} onClose={onClose}>
				<Button
					variant="ghost"
					onClick={standAt}
					className="ml-auto h-9 shrink-0 gap-2 rounded-xl px-3 text-muted-foreground"
				>
					<LibraryBigIcon />
					<span className="phone:sr-only">{t("facet.standAt")}</span>
				</Button>
			</SheetHeader>

			<ScrollArea className="min-h-0 flex-1">
				<div
					key={`${kind}:${name}`}
					className="motion-rise flex flex-col gap-7 phone:gap-6 phone:px-5 px-6 phone:py-5 py-6 pb-[calc(1.5rem+var(--safe-bottom))]"
				>
					<div className="flex flex-col gap-1">
						<h1 className="wrap-anywhere font-semibold text-2xl">{name}</h1>
						<span className="text-muted-foreground text-xs tabular-nums">
							{counted === undefined
								? ""
								: t("common.bookCount", { count: counted })}
						</span>
					</div>

					<FacetRename
						kind={kind}
						name={name}
						from={from}
						taken={taken}
						count={counted ?? total}
					/>

					<section className="flex flex-col gap-2.5">
						<h2 className="font-semibold text-muted-foreground text-xs tracking-[0.08em]">
							{t("facet.books")}
						</h2>

						{found.isPending ? (
							<div className="flex min-h-40 items-center justify-center">
								<Spinner aria-label={t("common.loading")} />
							</div>
						) : books.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								{t("facet.noBooks")}
							</p>
						) : (
							<>
								<div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] phone:grid-cols-[repeat(auto-fill,minmax(126px,1fr))] gap-x-5 phone:gap-x-3 gap-y-4 phone:gap-y-3">
									{books.map((book, index) => (
										<BookCard
											key={book.id}
											book={book}
											// A page shown later arrives in its own turn, not after the ones above.
											at={index % FACET_PAGE}
											onOpen={() => void navigate(bookLink(book.id))}
											onRead={() => void navigate(readLink(book.id))}
										/>
									))}
								</div>
								{found.isFetchingMore ? (
									<Spinner
										aria-label={t("common.loading")}
										className="self-center"
									/>
								) : (
									rest > 0 && (
										<ShowMore
											count={Math.min(rest, FACET_PAGE)}
											onClick={more}
										/>
									)
								)}
							</>
						)}
					</section>
				</div>
			</ScrollArea>
		</>
	);
}
