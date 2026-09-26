// The one banner the app speaks through.

import {
	FAILURE_CODES,
	type FailureCode,
	type FailureShape,
} from "@registrum/api/types";
import { create } from "zustand";
import { t } from "@/i18n";

/** Whether the banner is reporting trouble or saying something went right. */
export type Tone = "problem" | "done";

/** The one place the app speaks to the reader outside a screen. */
interface AlertState {
	message: string | null;
	tone: Tone;
	show: (message: string, tone: Tone) => void;
	dismiss: () => void;
}

export const useAlert = create<AlertState>((set) => ({
	message: null,
	tone: "problem",
	show: (message, tone) => set({ message, tone }),
	dismiss: () => set({ message: null }),
}));

/** Something went wrong, and the reader has to know. */
export function showAlert(message: string): void {
	useAlert.getState().show(message, "problem");
}

/** Something went right, and it is worth saying. */
export function showNotice(message: string): void {
	useAlert.getState().show(message, "done");
}

/**
 * The failure the server reported, if that is what was caught. It rides on a
 * tRPC error as `data.failure`.
 */
export function asFailure(error: unknown): FailureShape | null {
	if (typeof error !== "object" || error === null) return null;
	const data = (error as { data?: { failure?: unknown } }).data;
	const failure = data?.failure;
	if (typeof failure !== "object" || failure === null) return null;
	const { code, detail } = failure as { code?: unknown; detail?: unknown };
	if (!FAILURE_CODES.includes(code as FailureCode)) return null;
	return {
		code: code as FailureCode,
		detail: typeof detail === "string" ? detail : "",
	};
}

/** The wording for a code, which the catalogue files under `error.`. */
function wording(code: FailureCode, message: string): string {
	return t(`error.${code}`, { message });
}

/** What a caught thing says of itself. */
export function errorText(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/** The part of a failure that names what actually went wrong. */
export function describeError(error: unknown): string {
	const failure = asFailure(error);
	if (failure) return failure.detail || wording(failure.code, "");
	return errorText(error);
}

/** Says what went wrong, in the reader's language. */
export function failureMessage(error: unknown, fallback: string): string {
	const failure = asFailure(error);
	return failure ? wording(failure.code, failure.detail) : fallback;
}

/**
 * What was being attempted, for the case where what was caught does not say.
 * Every reason the server can give is also something the app can have been
 * doing, so the list is that one plus the attempts no call reports.
 */
export type Wording = FailureCode | "chooseFile" | "removeRecord" | "loadShelf";

/** Puts a caught failure in the banner, under the wording for what it was. */
export function reportFailure(error: unknown, attempt: Wording): void {
	showAlert(
		failureMessage(
			error,
			t(`error.${attempt}`, { message: describeError(error) }),
		),
	);
}
