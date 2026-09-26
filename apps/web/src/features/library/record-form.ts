// What the two record forms -- one book, and every ticked book -- share: how a
// field is bound, and how what was typed becomes what the record holds.

import type { Dispatch, SetStateAction } from "react";

/**
 * `value` and `onChange` for one field of a form held as one object, for the
 * inputs that hand back the value itself rather than an event.
 */
export function formBinder<F extends object>(
	form: F,
	setForm: Dispatch<SetStateAction<F>>,
) {
	return <K extends keyof F>(key: K) => ({
		value: form[key],
		onChange: (value: F[K]) =>
			setForm((current) => ({ ...current, [key]: value })),
	});
}

/** A volume as the field shows it. */
export function volumeText(index: number | null): string {
	return index === null ? "" : String(index);
}

/** A typed volume as the record takes it: null for none, undefined for text
 *  that is not a number. */
export function parseVolume(raw: string): number | null | undefined {
	if (raw === "") return null;
	const index = Number(raw);
	return Number.isFinite(index) ? index : undefined;
}

/** Typed text as the record takes it: nothing but spaces is no value. */
export function textOrNull(text: string): string | null {
	return text.trim() || null;
}
