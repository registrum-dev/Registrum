// Turning pages by side as well as by order.

import { useCallback, useMemo } from "react";

import type { PageDirection } from "@/features/reader/direction";
import type { FoliateView } from "@/features/reader/foliate";

export interface ReaderNavigation {
	goNext: () => void;
	goPrev: () => void;
	/** Physical sides: which of the two goes forward is the book's business. */
	goLeft: () => void;
	goRight: () => void;
	goStart: () => void;
	goEnd: () => void;
}

export function useReaderNavigation(
	view: FoliateView | null,
	direction: PageDirection,
): ReaderNavigation {
	const goNext = useCallback(() => void view?.next(), [view]);
	const goPrev = useCallback(() => void view?.prev(), [view]);
	const goLeft = useCallback(
		() => (direction.nextIsLeft ? goNext() : goPrev()),
		[direction.nextIsLeft, goNext, goPrev],
	);
	const goRight = useCallback(
		() => (direction.nextIsLeft ? goPrev() : goNext()),
		[direction.nextIsLeft, goNext, goPrev],
	);
	const goStart = useCallback(() => void view?.goTo(0), [view]);
	const goEnd = useCallback(() => void view?.goToFraction(1), [view]);

	return useMemo(
		() => ({ goNext, goPrev, goLeft, goRight, goStart, goEnd }),
		[goNext, goPrev, goLeft, goRight, goStart, goEnd],
	);
}
