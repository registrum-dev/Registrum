// The colours inside the book.

import type { ThemeName } from "@/features/reader/settings";
import { t } from "@/i18n";

export interface Palette {
	/** Page background inside the book. */
	bg: string;
	/** Body text inside the book. */
	fg: string;
	link: string;
	/** Drives form controls and scrollbars in the content frame. */
	scheme: "light" | "dark";
}

export const PALETTES: Record<ThemeName, Palette> = {
	light: { bg: "#ffffff", fg: "#1b1d1f", link: "#2563eb", scheme: "light" },
	sepia: { bg: "#f7f1e3", fg: "#38332a", link: "#8a5a1c", scheme: "light" },
	dark: { bg: "#14181d", fg: "#d3d8df", link: "#7fa8ff", scheme: "dark" },
};

export function themeLabel(name: ThemeName): string {
	return t(`theme.${name}`);
}
