import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { holdFile } from "@/features/reader/local-files";
import { pickBookFile } from "@/features/reader/open-book";
import { t } from "@/i18n";
import { describeError, showAlert } from "@/store/alert";

/** Opening a book file of the reader's own, which never goes to the server. */
export function useOpenBook() {
	const navigate = useNavigate();

	const openFile = useCallback(
		(file: File) => {
			void navigate({ to: "/read", search: { file: holdFile(file) } });
		},
		[navigate],
	);

	const pickAndOpen = useCallback(async () => {
		try {
			const file = await pickBookFile();
			if (file) openFile(file);
		} catch (error) {
			showAlert(t("error.chooseFile", { message: describeError(error) }));
		}
	}, [openFile]);

	return { openFile, pickAndOpen };
}
