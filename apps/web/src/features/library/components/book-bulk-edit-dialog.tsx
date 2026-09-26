// One value across every selected book.

import { Button } from "@Registrum/ui/components/button";
import { Checkbox } from "@Registrum/ui/components/checkbox";
import { Field, FieldGroup, FieldLabel } from "@Registrum/ui/components/field";
import { HeartIcon } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { AdaptiveDialog } from "@/components/adaptive-dialog";
import { NumberInput } from "@/components/number-input";
import { SheetBarButton } from "@/components/phone-sheet";
import { useResetOnOpen } from "@/features/library/hooks/use-reset-on-open";
import { type Edit, useUpdateBooks } from "@/features/library/mutations";
import {
	formBinder,
	parseVolume,
	textOrNull,
	volumeText,
} from "@/features/library/record-form";
import type {
	BookCategory,
	BookPatch,
	BookRating,
	BookRecord,
} from "@/features/library/types";
import { CategorySelect, RatingSelect } from "./category-select";
import {
	AuthorsInput,
	CollectionsInput,
	PublisherInput,
	SeriesInput,
	TagsInput,
} from "./record-fields";

type BulkField =
	| "authors"
	| "publisher"
	| "series"
	| "seriesIndexes"
	| "collections"
	| "tags"
	| "category"
	| "rating"
	| "favorite";

/** Which fields are ticked: only those are written. */
type Chosen = Record<BulkField, boolean>;

const NOTHING_CHOSEN: Chosen = {
	authors: false,
	publisher: false,
	series: false,
	seriesIndexes: false,
	collections: false,
	tags: false,
	category: false,
	rating: false,
	favorite: false,
};

interface BulkForm {
	chosen: Chosen;
	authors: string[];
	publisher: string;
	series: string;
	/** Keyed by book id: the volume is the one field every book needs its own. */
	seriesIndexes: Record<string, string>;
	collections: string[];
	tags: string[];
	category: BookCategory | null;
	rating: BookRating | null;
	favorite: boolean;
}

const EMPTY_FORM: BulkForm = {
	chosen: NOTHING_CHOSEN,
	authors: [],
	publisher: "",
	series: "",
	seriesIndexes: {},
	collections: [],
	tags: [],
	category: null,
	rating: null,
	favorite: true,
};

/** One value across every selected book. */
export function BulkEditDialog({
	books,
	open,
	onOpenChange,
	onDone,
}: {
	books: BookRecord[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDone: () => void;
}) {
	const { t } = useTranslation();
	const update = useUpdateBooks();
	const ids = {
		category: useId(),
		rating: useId(),
	};

	// Reopening starts from nothing ticked, whatever was done last time. The books
	// are read then rather than watched: they change under it while a run is out.
	const [form, setForm] = useResetOnOpen(
		open,
		(): BulkForm => ({
			...EMPTY_FORM,
			seriesIndexes: Object.fromEntries(
				books.map((book) => [book.id, volumeText(book.seriesIndex)]),
			),
		}),
	);
	const field = formBinder(form, setForm);
	const { chosen } = form;

	/** The tick box of one field. */
	const tick = (name: BulkField) => ({
		checked: chosen[name],
		onCheckedChange: (checked: boolean) =>
			setForm((current) => ({
				...current,
				chosen: { ...current.chosen, [name]: checked },
			})),
	});

	// Only the ticked fields are sent. A ticked field left empty means "clear it".
	const shared: BookPatch = {
		...(chosen.authors ? { authors: form.authors } : {}),
		...(chosen.publisher ? { publisher: textOrNull(form.publisher) } : {}),
		...(chosen.series ? { series: textOrNull(form.series) } : {}),
		...(chosen.collections ? { collections: form.collections } : {}),
		...(chosen.tags ? { tags: form.tags } : {}),
		...(chosen.category ? { category: form.category } : {}),
		...(chosen.rating ? { rating: form.rating } : {}),
		...(chosen.favorite ? { favorite: form.favorite } : {}),
	};

	// Only a volume that is going to be written has to read as one.
	const volumesValid =
		!chosen.seriesIndexes ||
		Object.values(form.seriesIndexes).every(
			(value) => parseVolume(value) !== undefined,
		);
	const anything = Object.keys(shared).length > 0 || chosen.seriesIndexes;

	/** Every book's change, handed over as one run. */
	const edits = (): Edit[] => {
		if (chosen.seriesIndexes) {
			return books.map((book) => ({
				ids: [book.id],
				patch: {
					...shared,
					seriesIndex: parseVolume(form.seriesIndexes[book.id] ?? "") ?? null,
				},
			}));
		}
		return Object.keys(shared).length
			? [{ ids: books.map((book) => book.id), patch: shared }]
			: [];
	};

	// Held up until the whole run has landed.
	const submit = () => {
		const run = edits();
		if (!run.length) return;
		update.mutate(run, {
			onSuccess: () => {
				onOpenChange(false);
				onDone();
			},
		});
	};

	const canApply = anything && volumesValid && !update.isPending;

	return (
		<AdaptiveDialog
			open={open}
			onOpenChange={onOpenChange}
			title={t("bulk.title", { count: books.length })}
			description={t("bulk.description", { count: books.length })}
			className="flex max-h-[calc(100svh-2rem)] flex-col sm:max-w-[560px]"
			leading={
				<SheetBarButton
					disabled={update.isPending}
					onClick={() => onOpenChange(false)}
				>
					{t("common.cancel")}
				</SheetBarButton>
			}
			trailing={
				<SheetBarButton strong disabled={!canApply} onClick={submit}>
					{t("common.apply")}
				</SheetBarButton>
			}
			footer={
				<>
					<Button
						variant="outline"
						disabled={update.isPending}
						onClick={() => onOpenChange(false)}
					>
						{t("common.cancel")}
					</Button>
					<Button disabled={!canApply} onClick={submit}>
						{t("bulk.apply", { count: books.length })}
					</Button>
				</>
			}
		>
			<FieldGroup className="desktop:-mx-6 desktop:min-h-0 desktop:flex-1 gap-3 desktop:overflow-y-auto desktop:px-6 desktop:py-1">
				<BulkRow label={t("field.author")} {...tick("authors")}>
					<AuthorsInput {...field("authors")} />
				</BulkRow>

				<BulkRow label={t("field.publisher")} {...tick("publisher")}>
					<PublisherInput {...field("publisher")} />
				</BulkRow>

				<BulkRow label={t("field.series")} {...tick("series")}>
					<SeriesInput {...field("series")} />
				</BulkRow>

				<BulkRow label={t("bulk.volumePerBook")} {...tick("seriesIndexes")}>
					<div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto rounded-md border border-border p-2">
						{books.map((book) => (
							<div key={book.id} className="flex items-center gap-2">
								<span
									className="min-w-0 flex-1 truncate text-sm"
									title={book.title}
								>
									{book.title}
								</span>
								<NumberInput
									aria-label={t("bulk.volumeOf", { title: book.title })}
									className="h-8 w-20 flex-none"
									value={form.seriesIndexes[book.id] ?? ""}
									onChange={(value) =>
										setForm((current) => ({
											...current,
											seriesIndexes: {
												...current.seriesIndexes,
												[book.id]: value,
											},
										}))
									}
								/>
							</div>
						))}
					</div>
				</BulkRow>

				<BulkRow label={t("field.collection")} {...tick("collections")}>
					<CollectionsInput {...field("collections")} />
				</BulkRow>

				<BulkRow label={t("field.tag")} {...tick("tags")}>
					<TagsInput {...field("tags")} />
				</BulkRow>

				<BulkRow label={t("field.category")} {...tick("category")}>
					<CategorySelect id={ids.category} {...field("category")} />
				</BulkRow>

				<BulkRow label={t("field.rating")} {...tick("rating")}>
					<RatingSelect id={ids.rating} {...field("rating")} />
				</BulkRow>

				<BulkRow label={t("field.favorite")} {...tick("favorite")}>
					<Button
						variant="outline"
						className="w-full justify-start"
						aria-pressed={form.favorite}
						onClick={() =>
							setForm((current) => ({
								...current,
								favorite: !current.favorite,
							}))
						}
					>
						<HeartIcon
							className={
								form.favorite ? "fill-current" : "text-muted-foreground"
							}
						/>
						{form.favorite ? t("bulk.makeFavorite") : t("bulk.clearFavorite")}
					</Button>
				</BulkRow>
			</FieldGroup>
		</AdaptiveDialog>
	);
}

/** A field that does nothing until it is ticked. */
function BulkRow({
	label,
	checked,
	onCheckedChange,
	children,
}: {
	label: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	children: React.ReactNode;
}) {
	return (
		<Field className="gap-1.5">
			<FieldLabel className="w-fit! cursor-pointer items-center">
				<Checkbox checked={checked} onCheckedChange={onCheckedChange} />
				{label}
			</FieldLabel>
			{/* Left in the flow but inert until ticked: the reader can see what they
          are about to set before committing to setting it. */}
			<div inert={!checked} className={checked ? "" : "opacity-40"}>
				{children}
			</div>
		</Field>
	);
}
