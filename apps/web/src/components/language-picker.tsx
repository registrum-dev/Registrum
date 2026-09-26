// Which of the two languages the app speaks.

import { cn } from "@registrum/ui/lib/utils";
import { useTranslation } from "react-i18next";
import { ChoiceGroup } from "@/components/choice-group";
import { useReaderSettings } from "@/features/reader/store";
import { LANGUAGES } from "@/i18n";

export function LanguagePicker({ className }: { className?: string }) {
	const { t } = useTranslation();
	const language = useReaderSettings((state) => state.settings.language);
	const update = useReaderSettings((state) => state.update);

	return (
		<ChoiceGroup
			value={language}
			onChange={(next) => update({ language: next })}
			className={cn(
				"w-full max-w-sm rounded-xl border border-border bg-card p-1",
				className,
			)}
			itemClassName="h-9 flex-1 font-normal"
			choices={LANGUAGES.map((name) => ({
				value: name,
				content: t(`language.${name}`),
			}))}
		/>
	);
}
