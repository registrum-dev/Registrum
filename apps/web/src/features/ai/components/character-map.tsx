// The map: who stands in what relation to whom.

import { cn } from "@Registrum/ui/lib/utils";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { borderPoint, boundsOf, layoutGraph, type Node } from "../graph-layout";
import type { Character, Graph } from "../types";

const ARROW_ID = "character-map-arrow";
const LABEL_FONT_SIZE = 11;
const LABEL_PADDING = 5;

/**
 * The map draws itself in the order it is read: the people stand up first, and
 * only then are the ties between them drawn from one to the other. A picture
 * whose lines and boxes all appear at once is a picture with no subject.
 *
 */
const EDGES_BEGIN = 220;

/** The delay the nth of a cascade waits (ms), capped. */
function stagger(at: number, step: number, cap: number): number {
	return Math.min(at * step, cap);
}

export function CharacterMap({
	characters,
	graph,
}: {
	characters: Character[];
	graph: Graph;
}) {
	const { t } = useTranslation();
	const layout = useMemo(
		() => layoutGraph(characters, graph.relations),
		[characters, graph],
	);

	/** Where boxes have been dragged to, by name, and nowhere else. Held for
	 *  one layout only: a map made again starts from where it was laid out. */
	const [dragged, setDragged] = useState<{
		layout: typeof layout;
		at: Record<string, { x: number; y: number }>;
	}>({ layout, at: {} });
	const moved = dragged.layout === layout ? dragged.at : null;
	const nodes = useMemo(
		() => layout.nodes.map((node) => ({ ...node, ...moved?.[node.name] })),
		[layout.nodes, moved],
	);
	const viewBox = useMemo(() => boundsOf(nodes), [nodes]);

	if (nodes.length === 0) return null;

	return (
		// Drawn at its own size and scrolled: a squeezed map has unreadable names.
		<div className="overflow-x-auto rounded-xl border border-border bg-card p-3">
			<svg
				role="img"
				aria-label={t("ai.mapOf", { count: nodes.length })}
				viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
				preserveAspectRatio="xMidYMid meet"
				style={{ width: viewBox.width, height: "auto" }}
				className="max-w-none touch-none select-none"
			>
				<defs>
					<marker
						id={ARROW_ID}
						viewBox="0 0 10 10"
						refX="9"
						refY="5"
						markerWidth="6"
						markerHeight="6"
						orient="auto-start-reverse"
					>
						<path d="M 0 0 L 10 5 L 0 10 z" className="fill-muted-foreground" />
					</marker>
				</defs>

				{layout.edges.map((edge, at) => {
					const from = nodes[edge.from];
					const to = nodes[edge.to];
					if (!from || !to) return null;
					return (
						<RelationLine
							key={`${edge.from}-${edge.to}-${at}`}
							from={from}
							to={to}
							label={edge.label}
							mutual={edge.mutual}
							delay={EDGES_BEGIN + stagger(at, 20, 300)}
						/>
					);
				})}

				{nodes.map((node, at) => (
					<PersonBox
						key={node.name}
						node={node}
						at={at}
						onDrag={(x, y) =>
							setDragged((held) => ({
								layout,
								at: {
									...(held.layout === layout ? held.at : {}),
									[node.name]: { x, y },
								},
							}))
						}
					/>
				))}
			</svg>
		</div>
	);
}

function RelationLine({
	from,
	to,
	label,
	mutual,
	delay,
}: {
	from: Node;
	to: Node;
	label: string;
	/** Whether the tie runs both ways. */
	mutual: boolean;
	/** When this one is drawn (ms), so the ties arrive in order. */
	delay: number;
}) {
	const start = borderPoint(from, to);
	const end = borderPoint(to, from);
	const midX = (start.x + end.x) / 2;
	const midY = (start.y + end.y) / 2;
	const width = label.length * LABEL_FONT_SIZE + LABEL_PADDING * 2;

	return (
		<g>
			<line
				x1={start.x}
				y1={start.y}
				x2={end.x}
				y2={end.y}
				strokeWidth={1.5}
				className="stroke-border"
				// An arrow says the tie runs one way ("looks up to"); a plain line
				// says it runs both ("married", "siblings").
				markerEnd={mutual ? undefined : `url(#${ARROW_ID})`}
				pathLength={1}
				strokeDasharray={1}
				style={{
					animation: `draw-line var(--dur-slow) var(--ease-standard) ${delay}ms backwards`,
				}}
			/>
			{/* Knocked out of the line behind it, so the word stays legible
          wherever the line happens to pass. The word waits for its own
          line to arrive rather than hanging in the air ahead of it. */}
			<g
				style={{
					animation: `arrive-fade var(--dur-standard) var(--ease-enter) calc(${delay}ms + var(--dur-slow) * 0.6) backwards`,
				}}
			>
				<rect
					x={midX - width / 2}
					y={midY - LABEL_FONT_SIZE}
					width={width}
					height={LABEL_FONT_SIZE * 2}
					rx={4}
					className="fill-card"
				/>
				<text
					x={midX}
					y={midY}
					textAnchor="middle"
					dominantBaseline="central"
					fontSize={LABEL_FONT_SIZE}
					className="fill-muted-foreground"
				>
					{label}
				</text>
			</g>
		</g>
	);
}

function PersonBox({
	node,
	at,
	onDrag,
}: {
	node: Node;
	/** Which of the cast this is, which is when it stands up. */
	at: number;
	onDrag: (x: number, y: number) => void;
}) {
	const [grabbed, setGrabbed] = useState<{ x: number; y: number } | null>(null);

	/** Pointer coordinates are the window's; the picture has its own. */
	const toSvg = (event: React.PointerEvent<SVGGElement>) => {
		const svg = event.currentTarget.ownerSVGElement;
		const matrix = svg?.getScreenCTM();
		if (!svg || !matrix) return null;
		const point = svg.createSVGPoint();
		point.x = event.clientX;
		point.y = event.clientY;
		return point.matrixTransform(matrix.inverse());
	};

	return (
		<g
			className="cursor-grab"
			// A `<g>` scales about the picture's origin unless it is told otherwise,
			// which would throw every box across the map on the way in.
			style={{
				animation: `arrive-grow var(--dur-standard) var(--ease-enter) ${stagger(at, 30, EDGES_BEGIN)}ms backwards`,
				transformBox: "view-box",
				transformOrigin: `${node.x}px ${node.y}px`,
			}}
			onPointerDown={(event) => {
				const spot = toSvg(event);
				if (!spot) return;
				event.currentTarget.setPointerCapture(event.pointerId);
				setGrabbed({ x: spot.x - node.x, y: spot.y - node.y });
			}}
			onPointerMove={(event) => {
				if (!grabbed) return;
				const spot = toSvg(event);
				if (spot) onDrag(spot.x - grabbed.x, spot.y - grabbed.y);
			}}
			onPointerUp={() => setGrabbed(null)}
			onPointerCancel={() => setGrabbed(null)}
		>
			<rect
				x={node.x - node.width / 2}
				y={node.y - node.height / 2}
				width={node.width}
				height={node.height}
				rx={8}
				strokeWidth={1}
				className={cn(
					node.role === "main" && "fill-primary stroke-primary",
					node.role === "supporting" && "fill-secondary stroke-border",
					node.role === "minor" && "fill-muted stroke-border",
				)}
			/>
			<text
				x={node.x}
				y={node.y}
				textAnchor="middle"
				dominantBaseline="central"
				fontSize={node.fontSize}
				className={cn(
					node.role === "main" ? "fill-primary-foreground" : "fill-foreground",
					"pointer-events-none",
				)}
			>
				{node.name}
			</text>
		</g>
	);
}
