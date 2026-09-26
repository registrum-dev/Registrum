import { useTranslation } from "react-i18next";
import { ChoiceGroup } from "@/components/choice-group";
import { THEME_NAMES } from "@/features/reader/settings";
import { useReaderSettings } from "@/features/reader/store";
import { PALETTES, themeLabel } from "@/features/reader/themes";

/** The three reading themes, each as a page of its own colours. */
export function ThemePicker({ className }: { className?: string }) {
	const { t } = useTranslation();
	const theme = useReaderSettings((state) => state.settings.theme);
	const update = useReaderSettings((state) => state.update);

	return (
		<ChoiceGroup
			value={theme}
			onChange={(next) => update({ theme: next })}
			aria-label={t("display.theme")}
			className={className}
			itemClassName="h-auto flex-1 flex-col items-stretch gap-1.5 p-2"
			choices={THEME_NAMES.map((name) => ({
				value: name,
				label: themeLabel(name),
				content: (
					<>
						<span
							aria-hidden="true"
							className="flex h-11 flex-col justify-start gap-1.5 rounded-md border border-border p-2.5"
							style={{ background: PALETTES[name].bg }}
						>
							<span
								className="h-1 rounded-full opacity-35"
								style={{ background: PALETTES[name].fg }}
							/>
							<span
								className="h-1 w-3/5 rounded-full opacity-35"
								style={{ background: PALETTES[name].fg }}
							/>
						</span>
						<span className="font-normal text-[11.5px]">
							{themeLabel(name)}
						</span>
					</>
				),
			}))}
		/>
	);
}
