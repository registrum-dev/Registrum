// The reader's display settings.

import { z } from "zod";

import { LANGUAGES } from "@/i18n";
import { looseRecord } from "@/lib/schema";

export const THEME_NAMES = ["light", "sepia", "dark"] as const;
const FLOW_MODES = ["paginated", "scrolled"] as const;
const FIT_MODES = ["fit-page", "fit-width"] as const;
export const MARGIN_SIZES = ["narrow", "normal", "wide"] as const;

export type ThemeName = (typeof THEME_NAMES)[number];
export type FlowMode = (typeof FLOW_MODES)[number];
export type FitMode = (typeof FIT_MODES)[number];
export type MarginSize = (typeof MARGIN_SIZES)[number];

/** How far the type may be taken, by the slider and by Ctrl plus or minus. */
export const FONT_SIZE = { min: 12, max: 40 } as const;

/** Each `catch` is also that setting's default: see `DEFAULT_SETTINGS` below. */
const settingsSchema = z.object({
	flow: z.enum(FLOW_MODES).catch("paginated"),
	maxColumnCount: z.number().catch(1),
	margins: z.enum(MARGIN_SIZES).catch("normal"),

	fontSize: z.number().catch(18),
	lineHeight: z.number().catch(1.7),
	letterSpacing: z.number().catch(0),
	fontFamily: z.string().catch(""),
	justify: z.boolean().catch(true),
	hyphenate: z.boolean().catch(true),
	strictLineBreak: z.boolean().catch(true),

	reverseDirection: z.boolean().catch(false),

	theme: z.enum(THEME_NAMES).catch("light"),
	language: z.enum(LANGUAGES).catch("auto"),

	fitMode: z.enum(FIT_MODES).catch("fit-page"),
	spread: z.boolean().catch(false),
	invertFixed: z.boolean().catch(false),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({});

export function mergeSettings(stored: unknown): Settings {
	return settingsSchema.parse(looseRecord.parse(stored));
}

const MARGIN_PRESETS: Record<
	MarginSize,
	{ maxInlineSize: number; gap: number; margin: number }
> = {
	narrow: { maxInlineSize: 1000, gap: 5, margin: 64 },
	normal: { maxInlineSize: 720, gap: 7, margin: 76 },
	wide: { maxInlineSize: 520, gap: 14, margin: 100 },
};

export function marginPreset(settings: Settings) {
	return MARGIN_PRESETS[settings.margins] ?? MARGIN_PRESETS.normal;
}
