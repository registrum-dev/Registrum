// The reader, pulled down by a finger the page reports from inside its iframe.
// Sheets do not come here: the platform scrolls them.

import { currentOffset, glide, LET_GO, speedTracker } from "@/lib/motion";

/** How far down, as a share of the window, a release still counts as leaving. */
const LEAVE_SHARE = 0.28;

/** How fast downward (px/s) a flick leaves from anywhere. */
const LEAVE_SPEED = 700;

/** How much a pull above where it rests gives: the root of the overshoot, times this. */
const RUBBER = 4;

export interface DragDismiss {
	/** The finger `distance` px past where it took hold, toward the way out. */
	pull: (distance: number) => void;
	/** The finger lifted: leave, or settle back. */
	release: () => void;
	/** The drag turned out not to be one: back where it rests, whatever the speed. */
	cancel: () => void;
}

/** How far a surface as tall as the window has to go to be off it. */
export const offScreen = () => window.innerHeight;

/** Sends `element` off the bottom of the window, carrying the speed it was let go at. */
export function slideAway(element: HTMLElement, velocity = 0) {
	return glide(element, currentOffset(element), offScreen(), {
		velocity,
		duration: LET_GO,
	});
}

/**
 * Moves `element` with the finger: one transform per touch, which is as often
 * as the page is drawn. Once let go, the rest is handed to the compositor.
 * `onLeave` is told the speed it was let go at.
 */
export function dragToDismiss(
	element: () => HTMLElement | null,
	onLeave: (velocity: number) => void,
): DragDismiss {
	let base: number | null = null;
	const trail = speedTracker();

	const settle = (from: HTMLElement, velocity: number) =>
		void glide(from, currentOffset(from), 0, { velocity, duration: LET_GO });

	return {
		pull(distance) {
			const target = element();
			if (!target) return;
			if (base === null) {
				// Taken hold of mid-flight: from wherever it is, not from rest.
				base = currentOffset(target);
				for (const running of target.getAnimations()) running.cancel();
				trail.reset();
			}
			const next = base + distance;
			const y = next < 0 ? -Math.sqrt(-next) * RUBBER : next;
			target.style.transform = `translateY(${y}px)`;
			trail.add(y, performance.now());
		},
		release() {
			const target = element();
			if (base === null || !target) return;
			base = null;
			// px/ms to px/s.
			const velocity = trail.speed() * 1000;
			if (
				currentOffset(target) > offScreen() * LEAVE_SHARE ||
				velocity > LEAVE_SPEED
			)
				onLeave(velocity);
			else settle(target, velocity);
		},
		cancel() {
			const target = element();
			if (base === null || !target) return;
			base = null;
			settle(target, 0);
		},
	};
}
