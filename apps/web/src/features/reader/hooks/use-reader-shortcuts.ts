// The keyboard.

import { useEffect, useEffectEvent } from "react";
import { exitFullscreen, toggleFullscreen } from "@/features/reader/fullscreen";
import type { ReaderNavigation } from "@/features/reader/hooks/use-reader-navigation";
import type { BookSource } from "@/features/reader/open-book";
import type { OpenPanel, ReaderPanel } from "@/features/reader/panels";
import { DEFAULT_SETTINGS, FONT_SIZE } from "@/features/reader/settings";
import { useSettings } from "@/features/reader/store";
import { isTyping } from "@/lib/keys";

/** What Ctrl and a key ask for together. */
type CtrlCombo = "search" | "larger" | "smaller" | "defaultSize";

/** What a key on its own asks the book for. */
type PageKey =
	| "left"
	| "right"
	| "previous"
	| "next"
	| "start"
	| "end"
	| "toc"
	| "fullscreen";

export interface ReaderActions extends ReaderNavigation {
	setPanel: (panel: ReaderPanel) => void;
	togglePanel: (panel: OpenPanel) => void;
}

export interface ReaderShortcuts {
	/** No book on screen means nothing to turn. */
	source: BookSource | null;
	canSearch: boolean;
	hasToc: boolean;
	/** Escape closes whatever is open over the page before it leaves fullscreen. */
	panel: ReaderPanel;
	actions: ReaderActions;
}

export function useReaderShortcuts({
	source,
	canSearch,
	hasToc,
	panel,
	actions,
}: ReaderShortcuts) {
	// Reads this render's options without the listener being put back each time.
	const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
		const typing = isTyping(event);

		if (event.key === "Escape") {
			if (panel !== "none") actions.setPanel("none");
			else void exitFullscreen();
			return;
		}
		if (typing) return;

		if (event.ctrlKey) {
			const combo = ctrlCombo(event);
			if (!combo) return;
			event.preventDefault();
			const { settings, update } = useSettings.getState();
			switch (combo) {
				case "search":
					if (canSearch) actions.togglePanel("search");
					return;
				case "larger":
					update({
						fontSize: Math.min(FONT_SIZE.max, settings.fontSize + 1),
					});
					return;
				case "smaller":
					update({
						fontSize: Math.max(FONT_SIZE.min, settings.fontSize - 1),
					});
					return;
				case "defaultSize":
					update({ fontSize: DEFAULT_SETTINGS.fontSize });
					return;
			}
		}

		if (!source) return;

		const key = pageKey(event);
		if (!key) return;
		// The contents key is a letter; the others are keys the page would
		// otherwise scroll on.
		if (key !== "toc") event.preventDefault();

		switch (key) {
			case "left":
				actions.goLeft();
				break;
			case "right":
				actions.goRight();
				break;
			case "previous":
				actions.goPrev();
				break;
			case "next":
				actions.goNext();
				break;
			case "start":
				actions.goStart();
				break;
			case "end":
				actions.goEnd();
				break;
			case "toc":
				if (hasToc) actions.togglePanel("toc");
				break;
			case "fullscreen":
				void toggleFullscreen();
				break;
		}
	});

	useEffect(() => {
		const listener = (event: KeyboardEvent) => onKeyDown(event);
		window.addEventListener("keydown", listener);
		return () => window.removeEventListener("keydown", listener);
	}, []);
}

function ctrlCombo(event: KeyboardEvent): CtrlCombo | null {
	switch (event.key) {
		case "f":
			return "search";
		case "+":
		case "=":
			return "larger";
		case "-":
			return "smaller";
		case "0":
			return "defaultSize";
		default:
			return null;
	}
}

function pageKey(event: KeyboardEvent): PageKey | null {
	switch (event.key) {
		case "ArrowLeft":
			return "left";
		case "ArrowRight":
			return "right";
		case "ArrowUp":
		case "PageUp":
			return "previous";
		case "ArrowDown":
		case "PageDown":
			return "next";
		case " ":
			return event.shiftKey ? "previous" : "next";
		case "Home":
			return "start";
		case "End":
			return "end";
		case "t":
		case "T":
			return "toc";
		case "F11":
			return "fullscreen";
		default:
			return null;
	}
}
