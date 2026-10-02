// Where the book was read to on another device, when that is further on.

import type { ReadingPosition } from "@registrum/api/types";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { FoliateView, RelocateDetail } from "@/features/reader/foliate";
import { api } from "@/lib/api";

interface PositionAhead {
	ahead: ReadingPosition | null;
	accept: () => void;
	decline: () => void;
}

/** Asks the shelf where the book was left, once it is open and whenever the
 *  page is seen again, and offers that place when it is further on. */
export function usePositionAhead({
	shelfId,
	bookId,
	view,
	openedAt,
	relocation,
}: {
	shelfId: string | null;
	bookId: string | null;
	view: FoliateView | null;
	/** The position the book was opened at. */
	openedAt: string | undefined;
	relocation: RelocateDetail | null;
}): PositionAhead {
	const [ahead, setAhead] = useState<ReadingPosition | null>(null);
	/** Places already known here, which another device did not move to. */
	const seen = useRef(new Set<string>());

	useEffect(() => {
		if (!bookId) return;
		return () => {
			seen.current = new Set();
			setAhead(null);
		};
	}, [bookId]);

	useEffect(() => {
		if (relocation?.cfi) seen.current.add(relocation.cfi);
	}, [relocation]);

	const offer = useEffectEvent(
		(askedFor: string, position: ReadingPosition | null | undefined) => {
			if (askedFor !== bookId || !position || !relocation?.cfi) return;
			if (seen.current.has(position.cfi)) return;
			if (position.fraction <= (relocation.fraction ?? 0)) return;
			setAhead(position);
		},
	);

	const check = useEffectEvent(async () => {
		if (!shelfId || !bookId) return;
		const askedFor = bookId;
		try {
			const record = await api.book.get.query({ shelfId, id: askedFor });
			offer(askedFor, record?.position);
		} catch {
			// Without the server there is nothing to compare with.
		}
	});

	const opened = useEffectEvent(() => {
		if (openedAt) seen.current.add(openedAt);
		void check();
	});

	useEffect(() => {
		if (view) opened();
	}, [view]);

	useEffect(() => {
		if (!view) return;
		const onVisible = () => {
			if (document.visibilityState === "visible") void check();
		};
		document.addEventListener("visibilitychange", onVisible);
		return () => document.removeEventListener("visibilitychange", onVisible);
	}, [view]);

	const accept = () => {
		if (!ahead) return;
		seen.current.add(ahead.cfi);
		void view?.goTo(ahead.cfi);
		setAhead(null);
	};

	const decline = () => {
		if (ahead) seen.current.add(ahead.cfi);
		setAhead(null);
	};

	return { ahead, accept, decline };
}
