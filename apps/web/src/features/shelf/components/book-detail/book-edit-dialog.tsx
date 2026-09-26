// Editing one book's record.

import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@registrum/ui/components/field";
import { Input } from "@registrum/ui/components/input";
import { Textarea } from "@registrum/ui/components/textarea";
import { RotateCcwIcon } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { NumberInput } from "@/components/number-input";
import {
	PhoneSheet,
	SheetBar,
	SheetBarButton,
	SheetBody,
} from "@/components/phone-sheet";
import {
	formBinder,
	parseVolume,
	textOrNull,
	volumeText,
} from "@/features/shelf/book-form";
import { DatePicker } from "@/features/shelf/components/book-detail/date-picker";
import { CategorySelect } from "@/features/shelf/components/category-select";
import { ConfirmButton } from "@/features/shelf/components/confirm-button";
import {
	AuthorsInput,
	CollectionsInput,
	PublisherInput,
	SeriesInput,
	TagsInput,
} from "@/features/shelf/components/record-fields";
import { useResetOnOpen } from "@/features/shelf/hooks/use-reset-on-open";
import { useUpdateBooks } from "@/features/shelf/mutations";
import { useShelfStore } from "@/features/shelf/store";
import type { BookRecord } from "@/features/shelf/types";

/** Editing one book's record. */
export function BookEditDialog({
	book,
	open,
	onOpenChange,
}: {
	book: BookRecord;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { t } = useTranslation();
	const update = useUpdateBooks();
	const rescan = useShelfStore((state) => state.rescan);

	const ids = {
		title: useId(),
		subtitle: useId(),
		authors: useId(),
		publisher: useId(),
		published: useId(),
		series: useId(),
		seriesIndex: useId(),
		collections: useId(),
		tags: useId(),
		category: useId(),
		description: useId(),
		note: useId(),
	};

	// Reopening starts from what is saved, read then rather than watched
	//.
	const [form, setForm] = useResetOnOpen(open, () => toForm(book));
	const field = formBinder(form, setForm);

	const seriesIndex = parseVolume(form.seriesIndex);
	const seriesIndexValid = seriesIndex !== undefined;
	const canSave = Boolean(form.title.trim()) && seriesIndexValid;

	/** The dialog stays up until the write lands, and closes itself when it does. */
	const submit = () => {
		if (!canSave || seriesIndex === undefined) return;
		const patch = {
			title: form.title.trim(),
			subtitle: textOrNull(form.subtitle),
			authors: form.authors,
			publisher: textOrNull(form.publisher),
			// The date field holds a day; a value the file wrote that is not a day
			// ("2024", "March 2024") is kept as it stands until a date is picked.
			published: form.published || textOrNull(form.publishedRaw),
			series: textOrNull(form.series),
			seriesIndex,
			collections: form.collections,
			tags: form.tags,
			category: form.category,
			description: textOrNull(form.description),
			note: textOrNull(form.note),
		};
		update.mutate(
			{ ids: [book.id], patch },
			{ onSuccess: () => onOpenChange(false) },
		);
	};

	const text = (key: "title" | "subtitle" | "description" | "note") => ({
		value: form[key],
		onChange: (event: { target: { value: string } }) =>
			setForm((current) => ({ ...current, [key]: event.target.value })),
	});

	return (
		// Cancel and save stand either side of the title: while the form is typed
		// into, a row of buttons at the foot is under the keyboard.
		<PhoneSheet
			open={open}
			onOpenChange={onOpenChange}
			kind="page"
			label={t("edit.title")}
		>
			<SheetBar
				leading={
					<SheetBarButton
						disabled={update.isPending}
						onClick={() => onOpenChange(false)}
					>
						{t("common.cancel")}
					</SheetBarButton>
				}
				title={t("edit.title")}
				trailing={
					// The label stays common.save throughout: a button that renames itself
					// mid-press has moved under the finger still on it.
					<SheetBarButton
						strong
						disabled={!canSave || update.isPending}
						onClick={submit}
					>
						{t("common.save")}
					</SheetBarButton>
				}
			/>
			<SheetBody className="flex flex-col gap-4">
				<p className="text-muted-foreground text-sm">{t("edit.description")}</p>
				<FieldGroup className="gap-3">
					<Field>
						<FieldLabel htmlFor={ids.title}>{t("field.title")}</FieldLabel>
						<Input id={ids.title} required {...text("title")} />
					</Field>

					<Field>
						<FieldLabel htmlFor={ids.subtitle}>{t("edit.subtitle")}</FieldLabel>
						<Input id={ids.subtitle} {...text("subtitle")} />
					</Field>

					<Field>
						<FieldLabel htmlFor={ids.authors}>{t("field.author")}</FieldLabel>
						<AuthorsInput id={ids.authors} {...field("authors")} />
					</Field>

					{/* Two fields on a line, stacked once the dialog is phone-width. */}
					<Field orientation="responsive" className="items-start gap-3">
						<Field className="min-w-0 flex-1">
							<FieldLabel htmlFor={ids.publisher}>
								{t("field.publisher")}
							</FieldLabel>
							<PublisherInput id={ids.publisher} {...field("publisher")} />
						</Field>
						<Field className="phone:w-auto w-48 flex-none">
							<FieldLabel htmlFor={ids.published}>
								{t("field.published")}
							</FieldLabel>
							<DatePicker
								id={ids.published}
								value={form.published}
								onChange={(published) =>
									// Touching the date is what discards a value that could not
									// be read as one — including clearing the field.
									setForm((current) => ({
										...current,
										published,
										publishedRaw: "",
									}))
								}
							/>
							{form.publishedRaw && (
								<FieldDescription>
									{t("edit.publishedRaw", { value: form.publishedRaw })}
								</FieldDescription>
							)}
						</Field>
					</Field>

					{/* The volume never wraps under the series: it is two characters wide. */}
					<Field orientation="horizontal" className="items-start gap-3">
						<Field className="min-w-0 flex-1">
							<FieldLabel htmlFor={ids.series}>{t("field.series")}</FieldLabel>
							<SeriesInput id={ids.series} {...field("series")} />
						</Field>
						<Field className="w-24 flex-none">
							<FieldLabel htmlFor={ids.seriesIndex}>
								{t("field.seriesIndex")}
							</FieldLabel>
							<NumberInput
								id={ids.seriesIndex}
								aria-invalid={!seriesIndexValid}
								{...field("seriesIndex")}
							/>
						</Field>
					</Field>

					<Field>
						<FieldLabel htmlFor={ids.collections}>
							{t("field.collection")}
						</FieldLabel>
						<CollectionsInput id={ids.collections} {...field("collections")} />
					</Field>

					<Field>
						<FieldLabel htmlFor={ids.tags}>{t("field.tag")}</FieldLabel>
						<TagsInput id={ids.tags} {...field("tags")} />
						<FieldDescription>{t("edit.tagsNote")}</FieldDescription>
					</Field>

					<Field>
						<FieldLabel htmlFor={ids.category}>
							{t("field.category")}
						</FieldLabel>
						<CategorySelect id={ids.category} {...field("category")} />
					</Field>

					<Field>
						<FieldLabel htmlFor={ids.description}>
							{t("record.description")}
						</FieldLabel>
						<Textarea id={ids.description} rows={4} {...text("description")} />
					</Field>

					<Field>
						<FieldLabel htmlFor={ids.note}>{t("record.note")}</FieldLabel>
						<Textarea
							id={ids.note}
							rows={3}
							placeholder={t("edit.notePlaceholder")}
							{...text("note")}
						/>
					</Field>
				</FieldGroup>

				{/* The bar holds cancel and save; putting the record back is the rare
            one, so it waits at the end of the form. */}
				<ConfirmButton
					variant="outline"
					disabled={update.isPending}
					title={t("edit.rescanTitle")}
					description={t("book.rescanDescription")}
					confirmLabel={t("book.rescanConfirm")}
					onConfirm={() => {
						onOpenChange(false);
						void rescan([book.id]);
					}}
				>
					<RotateCcwIcon />
					{t("book.rescan")}
				</ConfirmButton>
			</SheetBody>
		</PhoneSheet>
	);
}

function toForm(book: BookRecord) {
	return {
		title: book.title,
		subtitle: book.subtitle ?? "",
		authors: book.authors,
		publisher: book.publisher ?? "",
		published: book.publishedDay ?? "",
		publishedRaw: book.publishedDay ? "" : (book.published ?? ""),
		series: book.series ?? "",
		seriesIndex: volumeText(book.seriesIndex),
		collections: book.collections,
		tags: book.tags,
		category: book.category,
		description: book.description ?? "",
		note: book.note ?? "",
	};
}
