/** Fonts that ship with Windows 11 (and its optional Japanese supplement). */
import { t } from "@/i18n";

type FontName =
	| "fromBook"
	| "yuMincho"
	| "yuGothic"
	| "bizMincho"
	| "bizGothic"
	| "meiryo"
	| "msMincho"
	| "msGothic";

export interface FontChoice {
	/** A typeface is named in the catalogue only where its name is a word. */
	name?: FontName;
	label?: string;
	value: string;
}

export function fontLabel(font: FontChoice): string {
	return font.name ? t(`font.${font.name}`) : (font.label ?? "");
}

export const FONTS: FontChoice[] = [
	{ name: "fromBook", value: "" },
	{ name: "yuMincho", value: '"Yu Mincho", "游明朝", "YuMincho", serif' },
	{
		name: "yuGothic",
		value: '"Yu Gothic", "游ゴシック", "YuGothic", sans-serif',
	},
	{ name: "bizMincho", value: '"BIZ UDPMincho", serif' },
	{ name: "bizGothic", value: '"BIZ UDPGothic", sans-serif' },
	{ name: "meiryo", value: '"Meiryo", sans-serif' },
	{ name: "msMincho", value: '"MS Mincho", "ＭＳ明朝", serif' },
	{ name: "msGothic", value: '"MS Gothic", "ＭＳゴシック", sans-serif' },
	{ label: "Georgia", value: "Georgia, serif" },
	{ label: "Times New Roman", value: '"Times New Roman", Times, serif' },
	{ label: "Cambria", value: "Cambria, serif" },
	{ label: "Segoe UI", value: '"Segoe UI", system-ui, sans-serif' },
	{ label: "Arial", value: "Arial, Helvetica, sans-serif" },
	{ label: "Consolas", value: '"Cascadia Mono", Consolas, monospace' },
];
