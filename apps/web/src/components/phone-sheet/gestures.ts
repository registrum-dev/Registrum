// The ways a sheet is moved by hand that the platform's scrolling does not
// cover.

import { type RefObject, useEffect } from "react";
import { speedTracker } from "@/lib/motion";

export type Axis = "x" | "y";

export interface Stops {
	/** The scroll offset where the sheet is out of the window. */
	away: number;
	/** The scroll offset where it rests open. */
	open: number;
}

/** How far into the window a sheet has to come before being out of it again means closed (px). */
export const RISEN = 8;

/** How long a leave waits for the scroll to say it has ended (ms). */
export const LEAVE_LIMIT = 900;

/** How fast a pull has to be going to open or close whatever its distance (px/ms). */
const PULL_FLING = 0.4;

/**
 * Snapping is off while a hand moves the scroller, and comes back once the
 * scroll it lets go into has settled.
 */
function snapHold(box: HTMLElement) {
	let unsnap = () => {};
	const release = () => {
		unsnap();
		box.style.scrollSnapType = "";
	};
	return {
		hold: () => {
			box.style.scrollSnapType = "none";
		},
		release,
		releaseOnSettle: () => {
			const limit = window.setTimeout(release, LEAVE_LIMIT);
			const settled = () => release();
			box.addEventListener("scrollend", settled, { once: true });
			unsnap = () => {
				window.clearTimeout(limit);
				box.removeEventListener("scrollend", settled);
				unsnap = () => {};
			};
		},
	};
}

// WebKit does not scroll a scroller that takes no touches from a child that
// does, so the pull from the edge is followed by hand; the letting go is the
// platform's again.
export function useEdgePull(
	edge: boolean,
	scroller: RefObject<HTMLDivElement | null>,
	strip: RefObject<HTMLDivElement | null>,
	stops: () => Stops,
	offset: () => number,
	scrollTo: (to: number) => void,
) {
	useEffect(() => {
		const box = scroller.current;
		const grip = strip.current;
		if (!edge || !box || !grip) return;
		const snap = snapHold(box);
		let from: { x: number; y: number } | null = null;
		let pulling = false;
		const samples = speedTracker();
		const start = (event: TouchEvent) => {
			const touch = event.touches[0];
			if (event.touches.length !== 1 || !touch) return;
			snap.release();
			from = { x: touch.clientX, y: touch.clientY };
			pulling = false;
			samples.reset();
			samples.add(touch.clientX, event.timeStamp);
		};
		const move = (event: TouchEvent) => {
			const touch = event.touches[0];
			if (!from || !touch) return;
			event.preventDefault();
			const dx = touch.clientX - from.x;
			if (!pulling) {
				if (
					Math.abs(dx) < RISEN / 2 &&
					Math.abs(touch.clientY - from.y) < RISEN / 2
				)
					return;
				if (dx <= Math.abs(touch.clientY - from.y)) {
					from = null;
					return;
				}
				pulling = true;
				snap.hold();
			}
			const { away } = stops();
			box.scrollLeft = Math.max(0, away - dx);
			samples.add(touch.clientX, event.timeStamp);
		};
		const end = (event: TouchEvent) => {
			if (!from) return;
			from = null;
			if (!pulling) return;
			pulling = false;
			const speed = samples.speed();
			const { away, open } = stops();
			const shown = away - offset();
			const opening =
				event.type === "touchend" &&
				(speed > PULL_FLING || (speed > -PULL_FLING && shown > away * 0.4));
			snap.releaseOnSettle();
			scrollTo(opening ? open : away);
		};
		const listening = new AbortController();
		const { signal } = listening;
		grip.addEventListener("touchstart", start, { passive: true, signal });
		grip.addEventListener("touchmove", move, { passive: false, signal });
		grip.addEventListener("touchend", end, { signal });
		grip.addEventListener("touchcancel", end, { signal });
		return () => {
			snap.release();
			listening.abort();
		};
	}, [edge, scroller, strip, stops, offset, scrollTo]);
}

// A finger drags the sheet by scrolling it; a mouse cannot, so the grip at
// the top is followed by hand. Letting go closes it, or sends it back to
// the nearest place it rests, the way a finger's fling would.
export function useGripDrag(
	detent: boolean,
	scroller: RefObject<HTMLDivElement | null>,
	grip: RefObject<HTMLDivElement | null>,
	stops: () => Stops,
	scrollTo: (to: number) => void,
	hand: {
		touching: RefObject<boolean>;
		thrown: RefObject<boolean>;
		leaving: RefObject<boolean>;
		close: () => void;
	},
) {
	useEffect(() => {
		const box = scroller.current;
		const bar = grip.current;
		if (!box || !bar) return;
		const snap = snapHold(box);
		let from: { y: number; top: number } | null = null;
		const samples = speedTracker();
		const down = (event: PointerEvent) => {
			if (
				event.pointerType !== "mouse" ||
				event.button !== 0 ||
				hand.leaving.current
			)
				return;
			event.preventDefault();
			snap.release();
			bar.setPointerCapture(event.pointerId);
			from = { y: event.clientY, top: box.scrollTop };
			samples.reset();
			samples.add(event.clientY, event.timeStamp);
			hand.touching.current = true;
			snap.hold();
		};
		const move = (event: PointerEvent) => {
			if (!from) return;
			box.scrollTop = from.top - (event.clientY - from.y);
			samples.add(event.clientY, event.timeStamp);
		};
		const up = (event: PointerEvent) => {
			if (!from) return;
			from = null;
			hand.touching.current = false;
			// Positive is downward, toward closed.
			const speed = samples.speed();
			const { away, open } = stops();
			const full = box.scrollHeight - box.clientHeight;
			const at = box.scrollTop;
			const closing =
				event.type === "pointercancel"
					? false
					: speed > PULL_FLING ||
						(speed > -PULL_FLING && at - away < (open - away) * 0.6);
			snap.releaseOnSettle();
			if (closing) {
				hand.thrown.current = false;
				hand.close();
				return;
			}
			const higher =
				speed < -PULL_FLING || (speed <= PULL_FLING && at > (open + full) / 2);
			scrollTo(detent && higher ? full : open);
		};
		const listening = new AbortController();
		const { signal } = listening;
		bar.addEventListener("pointerdown", down, { signal });
		bar.addEventListener("pointermove", move, { signal });
		bar.addEventListener("pointerup", up, { signal });
		bar.addEventListener("pointercancel", up, { signal });
		return () => {
			snap.release();
			listening.abort();
		};
	}, [detent, scroller, grip, stops, scrollTo, hand]);
}

// A wheel moves what is under the pointer and nothing else: a sheet that
// closed because a list inside it had reached its top would be a sheet
// closed by reading it. Fingers still drag the sheet itself.
export function useWheelInside(
	scroller: RefObject<HTMLDivElement | null>,
	axis: Axis,
) {
	useEffect(() => {
		const box = scroller.current;
		if (!box) return;
		const onWheel = (event: WheelEvent) => {
			if (event.ctrlKey) return;
			const delta = axis === "x" ? event.deltaX : event.deltaY;
			const across = axis === "x" ? event.deltaY : event.deltaX;
			// Across the sheet's own axis the scroller does not move anyway.
			if (Math.abs(delta) <= Math.abs(across)) return;
			// Half up, what is inside does not scroll; the wheel lifts the sheet instead.
			if (box.hasAttribute("data-medium") && delta > 0) return;
			if (!scrollsWithin(event.target, box, axis, delta))
				event.preventDefault();
		};
		box.addEventListener("wheel", onWheel, { passive: false });
		return () => box.removeEventListener("wheel", onWheel);
	}, [scroller, axis]);
}

/**
 * Whether something between `target` and the sheet's own scroller can still
 * scroll `delta` along `axis`, and so is what the wheel should move.
 */
function scrollsWithin(
	target: EventTarget | null,
	box: HTMLElement,
	axis: Axis,
	delta: number,
) {
	for (
		let node = target instanceof Element ? target : null;
		node && node !== box;
		node = node.parentElement
	) {
		const style = getComputedStyle(node);
		const overflow = axis === "x" ? style.overflowX : style.overflowY;
		if (overflow !== "auto" && overflow !== "scroll") continue;
		const at = axis === "x" ? node.scrollLeft : node.scrollTop;
		const most =
			axis === "x"
				? node.scrollWidth - node.clientWidth
				: node.scrollHeight - node.clientHeight;
		if (delta < 0 ? at > 0 : at < most - 1) return true;
	}
	return false;
}
