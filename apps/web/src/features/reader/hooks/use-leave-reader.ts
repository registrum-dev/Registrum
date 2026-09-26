// Leaving the reader: sliding away, or pulled down.

import { useNavigate } from "@tanstack/react-router";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";

import { dragToDismiss, offScreen, slideAway } from "@/lib/drag-dismiss";
import { glide, reducedMotion, SCREEN_IN } from "@/lib/motion";

interface LeaveReaderOptions {
	id: string | undefined;
	from: "book" | undefined;
}

export function useLeaveReader({ id, from }: LeaveReaderOptions) {
	const navigate = useNavigate();

	const goBack = useCallback(() => {
		if (from === "book" && id) void navigate({ to: "/book", search: { id } });
		else void navigate({ to: "/" });
	}, [from, id, navigate]);

	/** The page as it rises and is pulled; the box around it only steps back. */
	const page = useRef<HTMLDivElement>(null);
	const leave = useCallback(
		(velocity = 0) => {
			if (!page.current || reducedMotion()) return goBack();
			void slideAway(page.current, velocity).then(goBack);
		},
		[goBack],
	);
	const drag = useMemo(() => dragToDismiss(() => page.current, leave), [leave]);

	useLayoutEffect(() => {
		if (!page.current) return;
		void glide(page.current, offScreen(), 0, { duration: SCREEN_IN });
		// Once, on arrival.
	}, []);

	return { page, leave, drag, goBack };
}
