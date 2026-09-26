import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { en } from "./en";
import { ja } from "./ja";

export const LANGUAGES = ["auto", "ja", "en"] as const;
const LOCALES = ["ja", "en"] as const;

export type Language = (typeof LANGUAGES)[number];
export type Locale = (typeof LOCALES)[number];

export function resolveLanguage(language: Language): Locale {
	if (language !== "auto") return language;
	const tag = (globalThis.navigator?.language ?? "en").toLowerCase();
	return tag === "ja" || tag.startsWith("ja-") ? "ja" : "en";
}

void i18n.use(initReactI18next).init({
	resources: { ja: { translation: ja }, en: { translation: en } },
	lng: resolveLanguage("auto"),
	fallbackLng: "en",
	interpolation: { escapeValue: false },
});

// The settings file has not been read yet, so this is the guess `__root.tsx`
// confirms or replaces once the store has hydrated.
document.documentElement.lang = i18n.language;

export function setLocale(locale: Locale) {
	void i18n.changeLanguage(locale);
	document.documentElement.lang = locale;
}

/** The language the screen is in right now. */
export function currentLocale(): Locale {
	const language = i18n.language;
	return (
		LOCALES.find((locale) => locale === language) ?? resolveLanguage("auto")
	);
}

/** Outside React — a store, a schema, an event handler — read the words here. */
export const t = i18n.t.bind(i18n);

export default i18n;
