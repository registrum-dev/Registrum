// One mark that travels between the rows of a list.

import { useLayoutEffect, useRef } from "react";

import { reducedMotion } from "@/lib/motion";

interface Left {
	element: Element;
	rect: DOMRect;
	at: number;
}

/** Where each mark last stood, as it was taken down. */
const left = new Map<string, Left>();

/** A mark taken down this long ago was in the same commit as the one put up. */
const SAME_COMMIT_MS = 50;

/**
 * For a mark drawn inside whichever row is current. When the row changes, the
 * new mark starts where the old one stood and moves to its own place, on
 * `transform` alone.
 */
export function useSharedMark<T extends HTMLElement>(
	id: string,
	timing: { duration: number; easing: string },
) {
	const ref = useRef<T>(null);

	useLayoutEffect(() => {
		const element = ref.current;
		if (!element) return;
		const before = left.get(id);
		left.delete(id);
		if (
			before &&
			before.element !== element &&
			performance.now() - before.at < SAME_COMMIT_MS &&
			!reducedMotion()
		) {
			const rect = element.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0) {
				const dx = before.rect.left - rect.left;
				const dy = before.rect.top - rect.top;
				const sx = before.rect.width / rect.width;
				const sy = before.rect.height / rect.height;
				element.animate(
					[
						{
							transformOrigin: "0 0",
							transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
						},
						{ transformOrigin: "0 0", transform: "none" },
					],
					timing,
				);
			}
		}
		return () => {
			left.set(id, {
				element,
				rect: element.getBoundingClientRect(),
				at: performance.now(),
			});
		};
	});

	return ref;
}
