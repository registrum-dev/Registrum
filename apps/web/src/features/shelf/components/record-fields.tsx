// The record's name fields, wired to the shelf's own names.

import { Button } from "@registrum/ui/components/button";
import { Input } from "@registrum/ui/components/input";
import { PlusIcon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
	NameInput,
	TokenInput,
} from "@/features/shelf/components/suggest-input";
import { useFacetNames } from "@/features/shelf/hooks/use-facet-names";
import { IDENTIFIER_SCHEMES } from "@/features/shelf/types";
import { randomId } from "@/lib/random-id";

interface ListProps {
	id?: string;
	value: string[];
	onChange: (value: string[]) => void;
}

interface NameProps {
	id?: string;
	value: string;
	onChange: (value: string) => void;
}

export function AuthorsInput(props: ListProps) {
	const names = useFacetNames("author");
	const { t } = useTranslation();
	return (
		<TokenInput
			{...props}
			suggestions={names}
			placeholder={t("book.authorsPlaceholder")}
		/>
	);
}

export function PublisherInput(props: NameProps) {
	const names = useFacetNames("publisher");
	return <NameInput {...props} suggestions={names} />;
}

export function SeriesInput(props: NameProps) {
	const names = useFacetNames("series");
	return <NameInput {...props} suggestions={names} />;
}

export function CollectionsInput(props: ListProps) {
	const names = useFacetNames("collection");
	const { t } = useTranslation();
	return (
		<TokenInput
			{...props}
			suggestions={names}
			placeholder={t("book.collectionsPlaceholder")}
		/>
	);
}

export function TagsInput(props: ListProps) {
	const names = useFacetNames("tag");
	const { t } = useTranslation();
	return (
		<TokenInput
			{...props}
			suggestions={names}
			placeholder={t("book.tagsPlaceholder")}
		/>
	);
}

/** One identifier as the form holds it. The key only keeps a row's inputs
 *  with it when a row above is removed. */
export interface IdentifierRow {
	key: string;
	scheme: string;
	value: string;
}

export function identifierRow(scheme = "", value = ""): IdentifierRow {
	return { key: randomId(), scheme, value };
}

const SCHEME_NAMES = IDENTIFIER_SCHEMES.map((scheme) => scheme.toUpperCase());

/** The identifiers, a row each: the scheme picked or typed, and the value. */
export function IdentifiersInput({
	id,
	value,
	onChange,
}: {
	id?: string;
	value: IdentifierRow[];
	onChange: (value: IdentifierRow[]) => void;
}) {
	const { t } = useTranslation();
	const set = (key: string, row: IdentifierRow | null) =>
		onChange(
			row
				? value.map((each) => (each.key === key ? row : each))
				: value.filter((each) => each.key !== key),
		);

	return (
		<div className="flex flex-col gap-2">
			{value.map((row, at) => (
				<div key={row.key} className="flex items-center gap-2">
					<div className="w-28 flex-none">
						<NameInput
							id={at === 0 ? id : undefined}
							value={row.scheme}
							suggestions={SCHEME_NAMES}
							onChange={(scheme) => set(row.key, { ...row, scheme })}
						/>
					</div>
					<Input
						className="min-w-0 flex-1 tabular-nums"
						aria-label={t("edit.identifierValue")}
						value={row.value}
						onChange={(event) =>
							set(row.key, { ...row, value: event.target.value })
						}
					/>
					<Button
						variant="ghost"
						size="icon"
						aria-label={t("edit.removeIdentifier")}
						onClick={() => set(row.key, null)}
					>
						<XIcon />
					</Button>
				</div>
			))}
			<Button
				variant="outline"
				size="sm"
				className="self-start"
				onClick={() => onChange([...value, identifierRow()])}
			>
				<PlusIcon />
				{t("edit.addIdentifier")}
			</Button>
		</div>
	);
}
