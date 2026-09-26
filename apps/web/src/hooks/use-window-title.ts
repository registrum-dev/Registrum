import { useEffect } from "react";

/** What the tab calls itself. */
export function useWindowTitle(title: string): void {
	useEffect(() => {
		document.title = title;
	}, [title]);
}
