// The category and rating pickers.

import { useTranslation } from "react-i18next";
import { LabeledSelect } from "@/components/labeled-select";
import { categoryName, ratingLabel } from "@/features/library/labels";
/** A `<Select>` cannot carry a null, so "none" travels as the filter's word
 *  for it. It never leaves the UI. */
import { NONE } from "@/features/library/query";
import {
	BOOK_CATEGORIES,
	BOOK_RATINGS,
	type BookCategory,
	type BookRating,
} from "@/features/library/types";

export function CategorySelect({
	id,
	value,
	onChange,
}: {
	id?: string;
	value: BookCategory | null;
	onChange: (value: BookCategory | null) => void;
}) {
	const { t } = useTranslation();

	return (
		<LabeledSelect
			id={id}
			aria-label={t("field.category")}
			value={value ?? NONE}
			options={[
				{
					value: NONE,
					label: t("book.none"),
					muted: true,
					separatorAfter: true,
				},
				...BOOK_CATEGORIES.map((category) => ({
					value: category,
					label: categoryName(category),
				})),
			]}
			onValueChange={(next) =>
				onChange(next === NONE ? null : (next as BookCategory))
			}
			className="w-full"
		/>
	);
}

export function RatingSelect({
	id,
	value,
	onChange,
}: {
	id?: string;
	value: BookRating | null;
	onChange: (value: BookRating | null) => void;
}) {
	const { t } = useTranslation();

	return (
		<LabeledSelect
			id={id}
			aria-label={t("field.rating")}
			value={value === null ? NONE : String(value)}
			options={[
				{ value: NONE, label: ratingLabel(null) },
				...BOOK_RATINGS.map((rating) => ({
					value: String(rating),
					label: ratingLabel(rating),
				})),
			]}
			onValueChange={(next) => onChange(next === NONE ? null : Number(next))}
			className="w-full"
		/>
	);
}
