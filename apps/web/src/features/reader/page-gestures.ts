// Taps, swipes and the wheel over the page.

/** How far a pointer may travel and still count as a tap rather than a drag. */
const TAP_SLOP = 6;

/** How much of either edge turns the page when tapped, as a share of the width. */
const TAP_EDGE = 0.3;

/** How far a finger must travel sideways before it is a swipe (px). */
const SWIPE_MIN = 48;

/** Where a sideways or downward drag stops being a scroll and becomes ours (px). */
const SWIPE_LOCK = 12;

/** How long after a swipe the browser's own click is still the swipe's. */
const SWIPE_CLICK_MS = 400;

/** `touchmove` has to be cancellable for a sideways drag to stay ours. */
const TOUCH_OPTS = { passive: false } as const;

/** The longest a wheel may keep turning pages without a fresh push. */
const WHEEL_GAP_MS = 200;

export interface PageGestureHandlers {
	/**
	 * Whether a page turn is a thing this book can do right now. In scrolled flow
	 * and on a fixed page zoomed past the window there is no next page — the
	 * gesture belongs to the scroll.
	 */
	canTurn: () => boolean;
	/** A plain tap on the page — not a drag, a selection or a link. */
	onTap: () => void;
	/**
	 * A tap near one edge or a sideways swipe. Physical sides, not next and
	 * previous: which of the two goes forward is the book's business.
	 */
	onTurn: (side: "left" | "right") => void;
	/** The wheel, which knows nothing of sides. */
	turnPage: (forward: boolean) => void;
	/** A downward drag as it goes: how far below where it took hold (px). */
	onPull: (distance: number) => void;
	/**
	 * The finger lifting off a downward drag. `cancelled` ended on a selection,
	 * and is no gesture at all.
	 */
	onPullEnd: (end: PullEnd) => void;
}

export type PullEnd = "released" | "cancelled";

export interface PageGestures {
	/** The book is in an iframe, so each section document needs them too. */
	bindDocument: (doc: Document) => void;
	detach: () => void;
}

/** Listens on the host for everything a finger or a mouse can ask of the page. */
export function attachPageGestures(
	host: HTMLElement,
	handlers: PageGestureHandlers,
): PageGestures {
	/** A finger, not a mouse: the tap zones and the swipe are for touch only. */
	const touchscreen = () => window.matchMedia("(pointer: coarse)").matches;

	/**
	 * Where across the host a press landed, 0 at the left edge and 1 at the
	 * right. An event from inside the book comes in the iframe's own
	 * coordinates, and a fixed-layout page is drawn through a `scale()`, so
	 * both have to be undone before the number means anything.
	 */
	const zoneOf = (event: MouseEvent): number | null => {
		const { left, width } = host.getBoundingClientRect();
		if (!width) return null;
		const frame = event.view?.frameElement;
		if (!frame) return (event.clientX - left) / width;
		const rect = frame.getBoundingClientRect();
		const drawn = event.view?.innerWidth ?? 0;
		const scale = drawn ? rect.width / drawn : 1;
		return (event.clientX * scale + rect.left - left) / width;
	};

	// foliate-js no longer follows a swipe itself (PATCHES.md), so this is the
	// whole of it.
	let swipeFrom: {
		x: number;
		y: number;
		onLink: boolean;
		/** Which way the drag was taken as, once it is clearly one. */
		axis: "none" | "side" | "down";
	} | null = null;
	let swipedAt = 0;

	// Where the press that may become a tap started, so a drag — a selection, a
	// swipe — can be told apart from a click.
	let pressedAt: { x: number; y: number } | null = null;
	const notePress = (event: PointerEvent) => {
		pressedAt =
			event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
	};

	const reportTap = (event: MouseEvent) => {
		const from = pressedAt;
		pressedAt = null;
		// A link has already been followed; foliate-js cancels those.
		if (event.defaultPrevented || event.button !== 0) return;
		if (
			from &&
			Math.hypot(event.clientX - from.x, event.clientY - from.y) > TAP_SLOP
		)
			return;
		const selection = (
			event.target as Node | null
		)?.ownerDocument?.getSelection();
		if (selection && !selection.isCollapsed) return;
		// The browser makes a click out of the swipe that has just turned the
		// page; turning a second page on it would be the gesture counted twice.
		if (Date.now() - swipedAt < SWIPE_CLICK_MS) return;

		if (touchscreen() && handlers.canTurn()) {
			const zone = zoneOf(event);
			if (zone !== null && zone < TAP_EDGE) return handlers.onTurn("left");
			if (zone !== null && zone > 1 - TAP_EDGE) return handlers.onTurn("right");
		}
		handlers.onTap();
	};

	const noteTouch = (event: TouchEvent) => {
		const touch = event.changedTouches[0];
		if (
			!touch ||
			event.touches.length !== 1 ||
			!touchscreen() ||
			!handlers.canTurn()
		) {
			swipeFrom = null;
			return;
		}
		const target = event.target as Element | null;
		swipeFrom = {
			x: touch.screenX,
			y: touch.screenY,
			onLink:
				typeof target?.closest === "function" &&
				Boolean(target.closest("a[href]")),
			axis: "none",
		};
	};

	const holdTouch = (event: TouchEvent) => {
		const touch = event.changedTouches[0];
		if (!swipeFrom || !touch || event.touches.length !== 1) return;
		const dx = touch.screenX - swipeFrom.x;
		const dy = touch.screenY - swipeFrom.y;
		// Once the drag is clearly sideways or down it is ours. Paginated text is
		// already held still by foliate-js; this is for the margins and a fixed page.
		if (swipeFrom.axis === "none") {
			if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_LOCK)
				swipeFrom.axis = "side";
			else if (dy > Math.abs(dx) && dy > SWIPE_LOCK) swipeFrom.axis = "down";
		}
		if (swipeFrom.axis !== "none" && event.cancelable) event.preventDefault();
		if (swipeFrom.axis === "down" && !swipeFrom.onLink)
			handlers.onPull(dy - SWIPE_LOCK);
	};

	const endTouch = (event: TouchEvent) => {
		const from = swipeFrom;
		swipeFrom = null;
		const touch = event.changedTouches[0];
		if (!from || from.onLink || !touch) return;
		const dx = touch.screenX - from.x;
		const dy = touch.screenY - from.y;
		const selection = (
			event.target as Node | null
		)?.ownerDocument?.getSelection();
		const selecting = Boolean(selection && !selection.isCollapsed);
		if (from.axis === "down") {
			swipedAt = Date.now();
			return handlers.onPullEnd(selecting ? "cancelled" : "released");
		}
		const sideways = Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy);
		if (!sideways || selecting) return;
		swipedAt = Date.now();
		// A finger moving left uncovers what lies to the right, which is the same
		// turn as tapping that edge.
		handlers.onTurn(dx < 0 ? "right" : "left");
	};

	// The platform can take the touch back mid-drag; the page must not be left
	// hanging where the finger was.
	const dropTouch = () => {
		const from = swipeFrom;
		swipeFrom = null;
		if (from?.axis === "down" && !from.onLink) handlers.onPullEnd("cancelled");
	};

	// Only taken over where there is nothing for the wheel to scroll.
	let lastWheelAt = 0;
	const turnPageOnWheel = (event: WheelEvent) => {
		if (!handlers.canTurn()) return;

		const delta = event.deltaY || event.deltaX;
		if (!delta) return;

		const now = Date.now();
		if (now - lastWheelAt < WHEEL_GAP_MS) return;
		lastWheelAt = now;

		handlers.turnPage(delta > 0);
	};

	const listening = new AbortController();
	const { signal } = listening;
	const listen = (target: GlobalEventHandlers) => {
		target.addEventListener("pointerdown", notePress, { signal });
		target.addEventListener("click", reportTap, { signal });
		target.addEventListener("touchstart", noteTouch, { ...TOUCH_OPTS, signal });
		target.addEventListener("touchmove", holdTouch, { ...TOUCH_OPTS, signal });
		target.addEventListener("touchend", endTouch, { signal });
		target.addEventListener("touchcancel", dropTouch, { signal });
	};
	listen(host);

	return {
		bindDocument(doc) {
			listen(doc);
			doc.addEventListener("wheel", turnPageOnWheel, {
				passive: true,
				signal,
			});
		},

		detach() {
			listening.abort();
		},
	};
}
