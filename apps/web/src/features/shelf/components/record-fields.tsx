// The record's name fields, wired to the shelf's own names.

import { useTranslation } from "react-i18next";

import {
	NameInput,
	TokenInput,
} from "@/features/shelf/components/suggest-input";
import { useFacetNames } from "@/features/shelf/hooks/use-facet-names";

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
