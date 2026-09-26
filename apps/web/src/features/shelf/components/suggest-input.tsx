// The two fields that answer with the shelf's own names.

import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxValue,
	useComboboxAnchor,
} from "@registrum/ui/components/combobox";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { foldIncludes, foldText } from "@/lib/fold";

const same = (a: string, b: string) => foldText(a) === foldText(b);

/** The typed name, when the shelf does not already hold it. */
const freshName = (typed: string, ...known: string[][]) =>
	typed && !known.some((list) => list.some((name) => same(name, typed)))
		? typed
		: null;

/** One name: picked from the shelf's own, or written fresh. */
export function NameInput({
	id,
	value,
	suggestions,
	onChange,
}: {
	id?: string;
	value: string;
	/** Every name of this kind in the shelf, most common first. */
	suggestions: string[];
	onChange: (value: string) => void;
}) {
	const { t } = useTranslation();

	const fresh = freshName(value.trim(), suggestions);

	return (
		<Combobox
			items={fresh ? [fresh, ...suggestions] : suggestions}
			value={value}
			onValueChange={(name: string | null) => onChange(name ?? "")}
			inputValue={value}
			onInputValueChange={onChange}
			// Typing `ｶﾀｶﾅ` has to find `カタカナ`, the same as in the search box.
			filter={foldIncludes}
		>
			<ComboboxInput id={id} className="w-full" />
			<ComboboxContent>
				<ComboboxEmpty>{t("book.noSuggestions")}</ComboboxEmpty>
				<ComboboxList>
					{(name: string) => (
						<ComboboxItem key={name} value={name}>
							{name === fresh ? t("book.addName", { name }) : name}
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}

/** A list of short names typed one at a time — authors, collections, keywords. */
export function TokenInput({
	id,
	value,
	onChange,
	suggestions = [],
	placeholder,
}: {
	id?: string;
	value: string[];
	onChange: (value: string[]) => void;
	suggestions?: string[];
	placeholder?: string;
}) {
	const { t } = useTranslation();
	const anchor = useComboboxAnchor();
	const [draft, setDraft] = useState("");

	const fresh = freshName(draft.trim(), suggestions, value);

	return (
		<Combobox
			multiple
			// So that Enter files whatever the list is pointing at, which for a new
			// name is the "add …" row at the top.
			autoHighlight
			items={fresh ? [fresh, ...suggestions] : suggestions}
			value={value}
			onValueChange={(next: string[]) => {
				onChange(next);
				setDraft("");
			}}
			inputValue={draft}
			onInputValueChange={setDraft}
			// Typing `ｶﾀｶﾅ` has to find `カタカナ`, the same as in the search box.
			filter={foldIncludes}
		>
			<ComboboxChips ref={anchor} className="min-h-9">
				<ComboboxValue>
					{(names: string[]) => (
						<Fragment>
							{names.map((name) => (
								<ComboboxChip key={name}>{name}</ComboboxChip>
							))}
							<ComboboxChipsInput
								id={id}
								placeholder={names.length ? undefined : placeholder}
							/>
						</Fragment>
					)}
				</ComboboxValue>
			</ComboboxChips>
			<ComboboxContent anchor={anchor}>
				<ComboboxEmpty>{t("book.noSuggestions")}</ComboboxEmpty>
				<ComboboxList>
					{(name: string) => (
						<ComboboxItem key={name} value={name}>
							{name === fresh ? t("book.addName", { name }) : name}
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}
