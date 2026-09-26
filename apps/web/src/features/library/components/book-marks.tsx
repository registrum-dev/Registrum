// The star, the heart, and the dot that says where the book stands.

import { Button } from "@Registrum/ui/components/button";
import { cn } from "@Registrum/ui/lib/utils";
import { HeartIcon, StarIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ratingLabel } from "@/features/library/labels";
import { useUpdateBooks } from "@/features/library/mutations";
import {
	BOOK_RATINGS,
	type BookRating,
	type BookRecord,
	type BookStatus,
} from "@/features/library/types";

/** A dot and a word rather than a badge, wherever the state is reported: it is
 *  a fact about the book, not a button. */
export function StatusDot({ status }: { status: BookStatus }) {
	return (
		<span
			className={cn(
				"size-1.75 shrink-0 rounded-full",
				status === "reading" ? "bg-primary" : "bg-muted-foreground/50",
			)}
		/>
	);
}

function Star({ filled, className }: { filled: boolean; className?: string }) {
	return (
		<StarIcon
			className={cn(
				"size-3.5",
				filled ? "fill-foreground text-foreground" : "text-muted-foreground/40",
				className,
			)}
		/>
	);
}

/** The rating as a row of stars, for places that only report it. */
export function RatingMark({ rating }: { rating: BookRating | null }) {
	if (rating === null) return null;
	const label = ratingLabel(rating);

	return (
		<div className="flex items-center" title={label}>
			{BOOK_RATINGS.map((value) => (
				<Star key={value} filled={value <= rating} className="size-3" />
			))}
			<span className="sr-only">{label}</span>
		</div>
	);
}

/**
 * Stars you can press. The one already set clears the rating, which is the
 * only way back to unrated once a book has been given a star.
 */
export function RatingPicker({ book }: { book: BookRecord }) {
	const { t } = useTranslation();
	const update = useUpdateBooks();
	const [hovered, setHovered] = useState<BookRating | null>(null);
	const shown = hovered ?? book.rating;

	return (
		// Leaving the row ends the preview. Nothing says it is busy: the star fills
		// on the press and the write goes out behind it.
		<div className="flex items-center" onPointerLeave={() => setHovered(null)}>
			{BOOK_RATINGS.map((value) => (
				<button
					key={value}
					type="button"
					aria-label={
						book.rating === value
							? t("book.clearRating", { title: book.title })
							: t("book.setRating", { title: book.title, rating: value })
					}
					aria-pressed={book.rating !== null && value <= book.rating}
					className="rounded-xs p-0.5 phone:p-1.5 outline-none focus-visible:outline-1 focus-visible:outline-ring"
					onPointerEnter={() => setHovered(value)}
					onFocus={() => setHovered(value)}
					onBlur={() => setHovered(null)}
					onClick={() =>
						update.mutate({
							ids: [book.id],
							patch: { rating: book.rating === value ? null : value },
						})
					}
				>
					<Star filled={shown !== null && value <= shown} />
				</button>
			))}
		</div>
	);
}

export function FavoriteToggle({
	book,
	variant = "ghost",
	size = "icon-sm",
	className,
}: {
	book: BookRecord;
	variant?: React.ComponentProps<typeof Button>["variant"];
	size?: React.ComponentProps<typeof Button>["size"];
	className?: string;
}) {
	const { t } = useTranslation();
	const update = useUpdateBooks();

	return (
		<Button
			variant={variant}
			size={size}
			className={className}
			aria-pressed={book.favorite}
			aria-label={
				book.favorite
					? t("book.unfavorite", { title: book.title })
					: t("book.favorite", { title: book.title })
			}
			onClick={() =>
				update.mutate({ ids: [book.id], patch: { favorite: !book.favorite } })
			}
		>
			{/* Filled or not filled, and never a third thing. The heart is the
          answer to the press, so it is the press that changes it. */}
			<HeartIcon
				className={book.favorite ? "fill-current" : "text-muted-foreground"}
			/>
		</Button>
	);
}

/** The favourite mark where there is nothing to press (a card on the shelf). */
export function FavoriteMark() {
	const { t } = useTranslation();

	return (
		<span title={t("shelf.favorite")} className="inline-flex text-foreground">
			<HeartIcon className="size-2.5 fill-current" />
			<span className="sr-only">{t("shelf.favorite")}</span>
		</span>
	);
}
