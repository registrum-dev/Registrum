// What moves from here moves through the Web
// Animations API, on `transform` only, so the compositor plays it.

/** `--dur-quick` / `--dur-standard` / `--dur-slow`, in milliseconds. */
const DURATION = { quick: 140, standard: 260, slow: 420 } as const;

/** `--ease-standard` / `--ease-enter` / `--ease-exit`. */
const EASE = {
	standard: "cubic-bezier(0.4, 0, 0.2, 1)",
	enter: "cubic-bezier(0.05, 0.7, 0.1, 1)",
	exit: "cubic-bezier(0.3, 0, 1, 1)",
} as const;

/** Hover and press: felt rather than watched. */
export const TOUCH = {
	duration: DURATION.quick,
	easing: EASE.standard,
} as const;

/** Whatever crosses the screen rather than arriving on it. */
export const MOVE = {
	duration: DURATION.standard,
	easing: EASE.standard,
} as const;

/** A whole screen rising over the one it was opened from (ms). */
export const SCREEN_IN = 460;

/** Whatever the finger lets go of (ms). */
export const LET_GO = 320;

export function reducedMotion(): boolean {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** How many points a spring is sampled at. Linear between them. */
const SAMPLES = 32;

/** ωt at which a critically damped spring from rest is within 0.1% of its target. */
const SETTLED = 9.23;

/**
 * A spring with no bounce, as the share of the way travelled at each sample.
 * `velocity` is in distances per second: 1 is the whole way in one second.
 */
function springCurve(duration: number, velocity: number): number[] {
	const omega = SETTLED / (duration / 1000);
	const points: number[] = [];
	for (let at = 0; at <= SAMPLES; at += 1) {
		const time = (at / SAMPLES) * (duration / 1000);
		points.push(1 - (1 + (omega - velocity) * time) * Math.exp(-omega * time));
	}
	points[SAMPLES] = 1;
	return points;
}

/**
 * Moves `element` down from `from` px to `to` px on a spring that starts at
 * `velocity` px/s. The spring is baked into keyframes rather than an easing, so
 * the whole of it is handed to the compositor at once.
 */
export function glide(
	element: HTMLElement,
	from: number,
	to: number,
	{
		velocity = 0,
		duration = LET_GO,
	}: { velocity?: number; duration?: number } = {},
): Promise<void> {
	const place = (at: number) => `translateY(${at}px)`;
	for (const running of element.getAnimations()) running.cancel();
	element.style.transform = to === 0 ? "none" : place(to);
	const distance = to - from;
	if (distance === 0 || reducedMotion()) return Promise.resolve();
	const curve = springCurve(duration, velocity / distance);
	const animation = element.animate(
		curve.map((share) => ({ transform: place(from + distance * share) })),
		{ duration, easing: "linear" },
	);
	return animation.finished.then(
		() => undefined,
		() => undefined,
	);
}

/** How far down `element` stands right now, mid-animation or not. */
export function currentOffset(element: HTMLElement): number {
	return new DOMMatrixReadOnly(getComputedStyle(element).transform).m42;
}

/** How far back a hand's speed is measured (ms). */
const SPEED_WINDOW = 80;

/**
 * The speed of something a hand is moving, from the last `SPEED_WINDOW` ms of
 * where it was. Positions in px, times in ms; the speed comes out in px/ms.
 */
export function speedTracker() {
	let samples: { at: number; t: number }[] = [];
	return {
		/** Forgets what went before: a new hold starts. */
		reset() {
			samples = [];
		},
		add(at: number, t: number) {
			samples = [
				...samples.filter((sample) => t - sample.t < SPEED_WINDOW),
				{ at, t },
			];
		},
		speed(): number {
			const first = samples[0];
			const last = samples.at(-1);
			return first && last && last.t > first.t
				? (last.at - first.at) / (last.t - first.t)
				: 0;
		},
	};
}
