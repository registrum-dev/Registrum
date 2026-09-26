// The record's name fields, wired to the library's own names.

import { useTranslation } from "react-i18next";

import {
	NameInput,
	TokenInput,
} from "@/features/library/components/suggest-input";
import { useNames } from "@/features/library/hooks/use-suggestions";

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
	const names = useNames("author");
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
	const names = useNames("publisher");
	return <NameInput {...props} suggestions={names} />;
}

export function SeriesInput(props: NameProps) {
	const names = useNames("series");
	return <NameInput {...props} suggestions={names} />;
}

export function CollectionsInput(props: ListProps) {
	const names = useNames("collection");
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
	const names = useNames("tag");
	const { t } = useTranslation();
	return (
		<TokenInput
			{...props}
			suggestions={names}
			placeholder={t("book.tagsPlaceholder")}
		/>
	);
}
