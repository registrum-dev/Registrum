// The two ways a book reaches the app from outside the page.

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isSupportedPath } from "@/features/reader/open-book";
import { useOpenBook } from "@/features/shelf/hooks/use-open-book";
import { isTyping } from "@/lib/keys";
import { showAlert } from "@/store/alert";

/** Whether a drag is carrying files, rather than text or a link. */
function carriesFiles(event: DragEvent): boolean {
	return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

/**
 * A file dropped on the window, and Ctrl+O. Both end in the same place, so
 * they live together.
 */
export function useArrivingBooks(): { dragging: boolean } {
	const { t } = useTranslation();
	const { openFile, pickAndOpen } = useOpenBook();
	const [dragging, setDragging] = useState(false);

	useEffect(() => {
		// Entering and leaving fire for every element crossed, so the drag is
		// counted in and out rather than switched.
		let depth = 0;
		const onEnter = (event: DragEvent) => {
			if (!carriesFiles(event)) return;
			event.preventDefault();
			depth += 1;
			setDragging(true);
		};
		const onOver = (event: DragEvent) => {
			if (carriesFiles(event)) event.preventDefault();
		};
		const onLeave = (event: DragEvent) => {
			if (!carriesFiles(event)) return;
			depth = Math.max(0, depth - 1);
			if (depth === 0) setDragging(false);
		};
		const onDrop = (event: DragEvent) => {
			if (!carriesFiles(event)) return;
			event.preventDefault();
			depth = 0;
			setDragging(false);
			const file = Array.from(event.dataTransfer?.files ?? []).find((each) =>
				isSupportedPath(each.name),
			);
			if (file) openFile(file);
			else showAlert(t("common.unsupportedDrop"));
		};

		window.addEventListener("dragenter", onEnter);
		window.addEventListener("dragover", onOver);
		window.addEventListener("dragleave", onLeave);
		window.addEventListener("drop", onDrop);
		return () => {
			window.removeEventListener("dragenter", onEnter);
			window.removeEventListener("dragover", onOver);
			window.removeEventListener("dragleave", onLeave);
			window.removeEventListener("drop", onDrop);
		};
	}, [openFile, t]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (isTyping(event)) return;
			if ((event.ctrlKey || event.metaKey) && event.key === "o") {
				event.preventDefault();
				void pickAndOpen();
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [pickAndOpen]);

	return { dragging };
}
