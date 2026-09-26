// Everything that rises over a screen: six shapes, one way of moving.
//
// A sheet is the far end of a scroller the size of the window. The finger
// scrolls it, so the platform tracks, flings and snaps it; the scrim and the
// step-back of what is under it run on the sheet's view timeline.

import { cn } from "@Registrum/ui/lib/utils";
import {
	type CSSProperties,
	type ReactNode,
	useCallback,
	useEffect,
	useEffectEvent,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { reducedMotion } from "@/lib/motion";
import { aboveStyle, useStackEmpty, useStackLayer } from "@/lib/sheet-stack";

import {
	LEAVE_LIMIT,
	RISEN,
	useEdgePull,
	useGripDrag,
	useWheelInside,
} from "./hand";
import { RANGE, SCRIM, SHAPE, type SheetKind } from "./kinds";

/** The same, for a sheet thrown out by hand, which coasts rather than being sent (ms). */
const THROWN_LIMIT = 2000;

/** The one layer every portalled sheet lives in: over the screens, under popups and banners. */
function sheetLayer(): HTMLElement {
	let layer = document.getElementById("phone-sheets");
	if (!layer) {
		layer = document.createElement("div");
		layer.id = "phone-sheets";
		layer.className = "pointer-events-none fixed inset-0 isolate z-35";
		document.body.append(layer);
	}
	return layer;
}

interface SheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	kind: SheetKind;
	/** What a screen reader calls it. */
	label: string;
	/**
	 * Waits just out of the window while closed, and a pull from the window's
	 * edge brings it out. Only while nothing is stacked over the screen.
	 */
	edge?: boolean;
	className?: string;
	children: ReactNode;
}

/** A sheet over whatever is on screen, for as long as `open` says. */
export function PhoneSheet({ onOpenChange, ...surface }: SheetProps) {
	const close = useCallback(() => onOpenChange(false), [onOpenChange]);
	const open = useCallback(() => onOpenChange(true), [onOpenChange]);
	return createPortal(
		<SheetSurface onClose={close} onOpen={open} {...surface} />,
		sheetLayer(),
	);
}

interface SurfaceProps extends Omit<SheetProps, "onOpenChange"> {
	onClose: () => void;
	/** Asked when an `edge` sheet is pulled out by hand. */
	onOpen?: () => void;
	/**
	 * A dialog: takes focus, answers Escape, and is what the phone's back
	 * gesture closes first. Off for a screen drawn as a sheet, which the router
	 * owns.
	 */
	modal?: boolean;
	/** Whether a sheet already open when this mounts rises, or is simply there. */
	appear?: boolean;
}

/**
 * The sheet itself, drawn where it is placed — the book's sheet, whose coming
 * and going is the router's, sits in the shelf's stack rather than the portal.
 * It stays mounted through its own way out.
 */
export function SheetSurface({ open, edge = false, ...props }: SurfaceProps) {
	const [mounted, setMounted] = useState(open);
	if (open && !mounted) setMounted(true);
	if (!mounted && !edge) return null;
	return (
		<Surface
			leaving={!open}
			idle={!mounted}
			edge={edge}
			onGone={() => setMounted(false)}
			{...props}
		/>
	);
}

function Surface({
	kind,
	label,
	onClose,
	onOpen,
	modal: dialog = true,
	appear = true,
	leaving,
	idle,
	edge,
	onGone,
	className,
	children,
}: Omit<SurfaceProps, "open"> & {
	leaving: boolean;
	idle: boolean;
	onGone: () => void;
}) {
	const scroller = useRef<HTMLDivElement>(null);
	const sheet = useRef<HTMLDivElement>(null);
	const strip = useRef<HTMLDivElement>(null);
	const grip = useRef<HTMLDivElement>(null);
	const { name, above } = useStackLayer(RANGE[kind].push, !idle);
	const alone = useStackEmpty();
	const axis = kind === "drawer" ? "x" : "y";
	const modal = dialog && !idle;
	// The latest, without making the listeners below start over each render.
	const close = useEffectEvent(onClose);
	const pulled = useEffectEvent(() => onOpen?.());
	const gone = useEffectEvent(onGone);
	/** Asked back while on its way out: the close's own scroll is not a throw. */
	const rising = useRef(false);
	const touching = useRef(false);
	const leavingNow = useRef(leaving);
	if (leaving) rising.current = false;
	else if (leavingNow.current && !touching.current) rising.current = true;
	leavingNow.current = leaving;
	const idleNow = useRef(idle);
	idleNow.current = idle;
	/** Closed by a throw: the coast carries it out, not a `scrollTo`. */
	const thrown = useRef(false);
	/** Until it has risen, being out of the window is where it starts. */
	const risen = useRef(!appear);
	useEffect(() => {
		if (idle) risen.current = false;
	}, [idle]);

	// `close` is an Effect Event: the one made on the first render still calls
	// the latest `onClose`.
	const hand = useMemo(
		() => ({ touching, thrown, leaving: leavingNow, close }),
		[],
	);

	const stops = useCallback(() => {
		const box = scroller.current!;
		if (axis === "x")
			return { away: box.scrollWidth - box.clientWidth, open: 0 };
		const most = box.scrollHeight - box.clientHeight;
		const open =
			kind === "detent"
				? Math.round((sheet.current?.offsetHeight ?? most) * 0.55)
				: most;
		return { away: 0, open };
	}, [axis, kind]);

	const scrollTo = useCallback(
		(to: number) => {
			const behavior = reducedMotion() ? "instant" : "smooth";
			scroller.current?.scrollTo(
				axis === "x" ? { left: to, behavior } : { top: to, behavior },
			);
		},
		[axis],
	);

	const offset = useCallback(
		() =>
			axis === "x" ? scroller.current!.scrollLeft : scroller.current!.scrollTop,
		[axis],
	);
	/** At the closed end or past it: the bounce there overshoots. */
	const out = useCallback(
		(at: number, away: number) =>
			axis === "x" ? at >= away - 1 : at <= away + 1,
		[axis],
	);

	// Arrives out of the window, then rises.
	useLayoutEffect(() => {
		const box = scroller.current;
		if (!box) return;
		const { away, open } = stops();
		const start = appear || idle ? away : open;
		if (axis === "x") box.scrollLeft = start;
		else box.scrollTop = start;
		// Once, on arrival.
	}, []);

	useEffect(() => {
		const { open, away } = stops();
		if (!leaving) {
			thrown.current = false;
			// Pulled out by hand: the finger has it, and the snap takes it from there.
			if (offset() !== open && !touching.current) scrollTo(open);
			else rising.current = false;
			return;
		}
		const box = scroller.current;
		if (!box || out(offset(), away) || reducedMotion()) {
			gone();
			return;
		}
		let done = false;
		const finish = () => {
			if (done || !leavingNow.current) return;
			done = true;
			gone();
		};
		const onScroll = () => {
			if (out(offset(), away)) finish();
		};
		// A coast that stops short is sent the rest of the way.
		const onEnd = () => {
			if (out(offset(), away)) finish();
			else if (thrown.current) {
				thrown.current = false;
				scrollTo(away);
			}
		};
		const listening = new AbortController();
		const { signal } = listening;
		box.addEventListener("scroll", onScroll, { passive: true, signal });
		box.addEventListener("scrollend", onEnd, { signal });
		const limit = window.setTimeout(
			finish,
			thrown.current ? THROWN_LIMIT : LEAVE_LIMIT,
		);
		if (!thrown.current) scrollTo(away);
		return () => {
			listening.abort();
			window.clearTimeout(limit);
		};
	}, [leaving, stops, scrollTo, offset, out]);

	// Let go and coasting out from its open place: the sheet has been thrown
	// out, and is closed then — out of reach of the next touch — while the coast
	// carries it the rest of the way. Out of the window is checked on every
	// scroll rather than at `scrollend`, which waits out the bounce at the closed
	// end. Half up, a `detent` keeps its content still so a drag lifts the sheet
	// first.
	useEffect(() => {
		const box = scroller.current;
		if (!box) return;
		let last = offset();
		let outward = false;
		// Once per letting go, so a close the caller turns down is not asked again every frame.
		let asked = false;
		const check = () => {
			const { away, open } = stops();
			const at = offset();
			if (at !== last) {
				outward = (at - last) * (away - open) > 0;
				last = at;
			}
			if (!out(at, away) && Math.abs(at - away) > RISEN) {
				risen.current = true;
				if (idleNow.current) pulled();
			}
			if (rising.current) {
				if (Math.abs(at - open) <= 1) rising.current = false;
				return;
			}
			if (
				!risen.current ||
				touching.current ||
				asked ||
				leavingNow.current ||
				open === away
			)
				return;
			const past = (at - open) * Math.sign(away - open) > RISEN;
			if (out(at, away) || (past && outward)) {
				asked = true;
				thrown.current = !out(at, away);
				close();
			}
		};
		const settle = () => {
			if (kind === "detent")
				box.toggleAttribute(
					"data-medium",
					offset() < box.scrollHeight - box.clientHeight - 1,
				);
			check();
		};
		const down = () => {
			touching.current = true;
			rising.current = false;
			asked = false;
			if (!leavingNow.current || idleNow.current) thrown.current = false;
		};
		const up = () => {
			touching.current = false;
			// Which way the finger was going is not which way the coast goes.
			outward = false;
			check();
		};
		const listening = new AbortController();
		const { signal } = listening;
		box.addEventListener("scroll", check, { passive: true, signal });
		box.addEventListener("scrollend", settle, { signal });
		box.addEventListener("touchstart", down, { passive: true, signal });
		box.addEventListener("touchend", up, { signal });
		box.addEventListener("touchcancel", up, { signal });
		return () => listening.abort();
	}, [kind, stops, offset, out]);

	useEdgePull(edge ?? false, scroller, strip, stops, offset, scrollTo);
	useGripDrag(kind === "detent", scroller, grip, stops, scrollTo, hand);
	useWheelInside(scroller, axis);

	// A native listener, not React's: React would also hand this Escape from a
	// popup portalled out of the sheet, which has already answered it.
	useEffect(() => {
		const surface = sheet.current;
		if (!modal || !surface) return;
		const before = document.activeElement as HTMLElement | null;
		surface.focus({ preventScroll: true });
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			event.stopPropagation();
			close();
		};
		surface.addEventListener("keydown", onKey);
		return () => {
			surface.removeEventListener("keydown", onKey);
			before?.focus?.({ preventScroll: true });
		};
	}, [modal]);

	const timeline = {
		"--layer": name ?? "none",
		"--lift": RANGE[kind].lift,
		"--scrim": SCRIM[kind],
	} as CSSProperties;

	const surface = (
		<div
			ref={sheet}
			role={modal ? "dialog" : undefined}
			aria-modal={modal || undefined}
			aria-label={label}
			inert={idle}
			tabIndex={-1}
			data-kind={kind}
			style={
				name
					? ({
							viewTimelineName: name,
							viewTimelineAxis: axis === "x" ? "inline" : "block",
						} as CSSProperties)
					: undefined
			}
			className={cn(
				"relative flex flex-col overflow-clip outline-none",
				axis === "x" ? "snap-start" : "snap-end",
				SHAPE[kind],
				className,
			)}
		>
			{kind === "detent" && (
				<div
					aria-hidden
					className="pointer-events-none absolute inset-x-0 top-[55%] h-0 snap-end"
				/>
			)}
			{kind !== "drawer" && (
				<div
					ref={grip}
					aria-hidden
					className="flex h-4.5 shrink-0 cursor-grab items-center justify-center active:cursor-grabbing"
				>
					<div className="h-1.25 w-10 rounded-full bg-border" />
				</div>
			)}
			{children}
		</div>
	);

	// Whatever of the window the sheet does not cover closes it when touched,
	// the way the scrim under it would.
	// While an `edge` sheet waits, the only part of it that takes a touch is a
	// strip along the window's edge. It stays through a pull, which it carries.
	const spacer = (
		<div
			aria-hidden
			onClick={leaving ? undefined : onClose}
			className={cn(
				"relative",
				axis === "x" ? "h-full w-dvw shrink-0 snap-end" : "h-full snap-start",
			)}
		>
			{edge && (
				<div
					ref={strip}
					className={cn(
						"absolute inset-y-0 left-0 w-[calc(1.25rem+var(--safe-left))] touch-none",
						idle && alone ? "pointer-events-auto" : "pointer-events-none",
					)}
				/>
			)}
		</div>
	);

	return (
		<div
			style={timeline}
			className={cn(
				"fixed inset-0",
				leaving ? "pointer-events-none" : "pointer-events-auto",
			)}
		>
			{SCRIM[kind] > 0 && !idle && (
				<div
					aria-hidden
					data-axis={axis}
					className="sheet-scrim absolute inset-0 bg-black"
				/>
			)}
			<div
				ref={scroller}
				data-axis={axis}
				style={aboveStyle(above)}
				// Beside a sheet held to its width is the window too.
				onClick={(event) => {
					if (event.target === event.currentTarget && !leaving) onClose();
				}}
				className={cn(
					"sheet-scroller absolute inset-0",
					above && "sheet-stepped",
				)}
			>
				{axis === "x" ? (
					<div className="flex h-full w-max">
						{surface}
						{spacer}
					</div>
				) : (
					<>
						{spacer}
						{surface}
					</>
				)}
			</div>
		</div>
	);
}
