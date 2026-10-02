// One picture from the book, over everything, to be looked at closely.

import { XIcon } from "lucide-react";
import {
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";

const MAX_SCALE = 8;

/** Where a double tap or a key takes the picture from fitting the window. */
const STEP_SCALE = 2.5;

const DOUBLE_TAP_MS = 300;
const TAP_SLOP = 6;

interface Transform {
	scale: number;
	x: number;
	y: number;
}

const FITTED: Transform = { scale: 1, x: 0, y: 0 };

/** A point relative to the middle of the frame, where the picture is centred. */
interface Point {
	x: number;
	y: number;
}

interface ImageViewerProps {
	src: string;
	onClose: () => void;
}

export function ImageViewer({ src, onClose }: ImageViewerProps) {
	const { t } = useTranslation();
	const frameRef = useRef<HTMLDivElement | null>(null);
	const imageRef = useRef<HTMLImageElement | null>(null);
	const [transform, setTransform] = useState<Transform>(FITTED);
	const current = useRef(transform);
	current.current = transform;

	/** Keeps the picture from being dragged off, and from shrinking past fitting. */
	const clamp = (next: Transform): Transform => {
		const frame = frameRef.current;
		const image = imageRef.current;
		const scale = Math.min(MAX_SCALE, Math.max(1, next.scale));
		if (!frame || !image) return { ...next, scale };
		const spareX = Math.max(
			0,
			(image.offsetWidth * scale - frame.clientWidth) / 2,
		);
		const spareY = Math.max(
			0,
			(image.offsetHeight * scale - frame.clientHeight) / 2,
		);
		return {
			scale,
			x: Math.min(spareX, Math.max(-spareX, next.x)),
			y: Math.min(spareY, Math.max(-spareY, next.y)),
		};
	};

	/** Scales by `factor` keeping whatever is under `at` where it is. */
	const zoomAt = (from: Transform, factor: number, at: Point): Transform => {
		const scale = Math.min(MAX_SCALE, Math.max(1, from.scale * factor));
		const ratio = scale / from.scale;
		return clamp({
			scale,
			x: at.x - (at.x - from.x) * ratio,
			y: at.y - (at.y - from.y) * ratio,
		});
	};

	const pointIn = (clientX: number, clientY: number): Point => {
		const rect = frameRef.current?.getBoundingClientRect();
		if (!rect) return { x: 0, y: 0 };
		return {
			x: clientX - rect.left - rect.width / 2,
			y: clientY - rect.top - rect.height / 2,
		};
	};

	const toggleAt = (at: Point) => {
		const from = current.current;
		setTransform(
			from.scale > 1 ? FITTED : zoomAt(from, STEP_SCALE / from.scale, at),
		);
	};

	// The book's keys are not for the page underneath while this is up.
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			event.stopImmediatePropagation();
			const centre = { x: 0, y: 0 };
			switch (event.key) {
				case "Escape":
					event.preventDefault();
					onClose();
					return;
				case "+":
				case "=":
					event.preventDefault();
					setTransform((from) => zoomAt(from, 1.5, centre));
					return;
				case "-":
					event.preventDefault();
					setTransform((from) => zoomAt(from, 1 / 1.5, centre));
					return;
				case "0":
					event.preventDefault();
					setTransform(FITTED);
					return;
			}
		};
		window.addEventListener("keydown", onKey, { capture: true });
		return () =>
			window.removeEventListener("keydown", onKey, { capture: true });
	});

	// Not a passive listener: a trackpad's pinch arrives as a Ctrl+wheel, which
	// the browser would otherwise take to zoom the whole app.
	useEffect(() => {
		const frame = frameRef.current;
		if (!frame) return;
		const onWheel = (event: WheelEvent) => {
			event.preventDefault();
			const unit = event.deltaMode === 1 ? 16 : 1;
			const factor = Math.exp(-event.deltaY * unit * 0.002);
			const at = pointIn(event.clientX, event.clientY);
			setTransform((from) => zoomAt(from, factor, at));
		};
		frame.addEventListener("wheel", onWheel, { passive: false });
		return () => frame.removeEventListener("wheel", onWheel);
	});

	useEffect(() => {
		const onResize = () => setTransform((from) => clamp(from));
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	});

	const pointers = useRef(new Map<number, Point>());
	const gesture = useRef<{
		start: Transform;
		/** Where the fingers were, between them, and how far apart, as it began. */
		mid: Point;
		spread: number;
		moved: boolean;
		onImage: boolean;
	} | null>(null);
	const lastTap = useRef<{ at: Point; time: number } | null>(null);

	const begin = () => {
		const fingers = between(pointers.current);
		if (!fingers) return;
		gesture.current = {
			start: current.current,
			...fingers,
			moved: gesture.current?.moved ?? false,
			onImage: gesture.current?.onImage ?? false,
		};
	};

	const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		const first = pointers.current.size === 0;
		pointers.current.set(
			event.pointerId,
			pointIn(event.clientX, event.clientY),
		);
		if (first) gesture.current = null;
		begin();
		if (first && gesture.current)
			gesture.current.onImage = event.target === imageRef.current;
	};

	const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (!pointers.current.has(event.pointerId)) return;
		pointers.current.set(
			event.pointerId,
			pointIn(event.clientX, event.clientY),
		);
		const g = gesture.current;
		if (!g) return;
		const fingers = between(pointers.current);
		if (!fingers) return;
		const { mid, spread } = fingers;
		if (!g.moved && Math.hypot(mid.x - g.mid.x, mid.y - g.mid.y) > TAP_SLOP)
			g.moved = true;
		if (!g.moved && pointers.current.size < 2) return;
		g.moved = true;
		const factor = g.spread > 0 && spread > 0 ? spread / g.spread : 1;
		const zoomed = zoomAt(g.start, factor, g.mid);
		setTransform(
			clamp({
				...zoomed,
				x: zoomed.x + mid.x - g.mid.x,
				y: zoomed.y + mid.y - g.mid.y,
			}),
		);
	};

	const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
		const at = pointers.current.get(event.pointerId);
		if (!at || !pointers.current.delete(event.pointerId)) return;
		// The finger left behind carries on from where the pair got to.
		if (pointers.current.size > 0) return begin();

		const g = gesture.current;
		gesture.current = null;
		if (!g || g.moved || event.type === "pointercancel") return;

		if (!g.onImage) {
			lastTap.current = null;
			if (current.current.scale === 1) onClose();
			return;
		}
		const now = Date.now();
		const last = lastTap.current;
		if (
			last &&
			now - last.time < DOUBLE_TAP_MS &&
			Math.hypot(at.x - last.at.x, at.y - last.at.y) < 24
		) {
			lastTap.current = null;
			toggleAt(at);
			return;
		}
		lastTap.current = { at, time: now };
	};

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label={t("reader.imageViewer")}
			className="chrome absolute inset-0 z-50 animate-[arrive-fade_var(--dur-standard)_var(--ease-enter)_backwards] bg-black/90 data-leaving:animate-[leave-fade_var(--dur-standard)_var(--ease-exit)_forwards]"
		>
			<div
				ref={frameRef}
				className="absolute inset-0 flex touch-none items-center justify-center overflow-hidden"
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
			>
				<img
					ref={imageRef}
					src={src}
					alt=""
					draggable={false}
					className="max-h-full max-w-full select-none object-contain"
					style={{
						transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
						cursor: transform.scale > 1 ? "grab" : "zoom-in",
					}}
				/>
			</div>
			<button
				type="button"
				// biome-ignore lint/a11y/noAutofocus: the dialog has nothing else to focus
				autoFocus
				aria-label={t("reader.closeImage")}
				title={t("reader.closeImage")}
				onClick={onClose}
				className="chrome-surface absolute top-[calc(0.5rem+var(--safe-top))] right-[calc(0.75rem+var(--safe-right))] flex size-10 items-center justify-center rounded-full transition-colors hover:bg-muted [&_svg]:size-4.5"
			>
				<XIcon />
			</button>
		</div>
	);
}

/** The point between the first two pointers down, and how far apart they are. */
function between(
	pointers: Map<number, Point>,
): { mid: Point; spread: number } | null {
	const [a, b] = pointers.values();
	if (!a) return null;
	if (!b) return { mid: a, spread: 0 };
	return {
		mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
		spread: Math.hypot(a.x - b.x, a.y - b.y),
	};
}
