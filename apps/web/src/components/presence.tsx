// Keeps what is leaving on screen until its own CSS has played it out.

import {
	Children,
	isValidElement,
	type Key,
	type ReactElement,
	type ReactNode,
	useEffectEvent,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

/** Marks `element` as leaving, and resolves once whatever that set off has finished. */
function playOut(element: Element | null): Promise<void> {
	if (!element) return Promise.resolve();
	element.setAttribute("data-leaving", "");
	// A spinner inside turns forever; waiting on it would keep the leaver for good.
	const running = element
		.getAnimations({ subtree: true })
		.filter(
			(animation) =>
				animation.effect?.getComputedTiming().endTime !==
				Number.POSITIVE_INFINITY,
		);
	return Promise.all(running.map((animation) => animation.finished)).then(
		() => undefined,
		() => undefined,
	);
}

type Child = ReactElement | null;

function only(children: ReactNode): Child {
	const child = Children.toArray(children).find(isValidElement);
	return child ?? null;
}

/**
 * One child at a time. When it goes, or is replaced by one with another key,
 * the old one gets `data-leaving` and stays until its animations end; only
 * then does the new one mount. The child's element carries its own exit, as a
 * `motion-*` utility or its own `[data-leaving]` rule.
 */
export function Presence({ children }: { children?: ReactNode }) {
	const incoming = only(children);
	const [shown, setShown] = useState<Child>(incoming);
	const box = useRef<HTMLDivElement>(null);
	const latest = useEffectEvent(() => incoming);
	const leaving = useRef<Key | null | undefined>(undefined);

	const same = shown && incoming && shown.key === incoming.key;

	useLayoutEffect(() => {
		if (same) {
			// Asked back before it had gone.
			box.current?.firstElementChild?.removeAttribute("data-leaving");
			leaving.current = undefined;
			return;
		}
		if (shown === incoming) return;
		if (!shown) {
			setShown(incoming);
			return;
		}
		if (leaving.current === shown.key) return;
		leaving.current = shown.key;
		void playOut(box.current?.firstElementChild ?? null).then(() => {
			leaving.current = undefined;
			setShown(latest());
		});
	});

	return (
		<div ref={box} className="contents">
			{same ? incoming : shown}
		</div>
	);
}
