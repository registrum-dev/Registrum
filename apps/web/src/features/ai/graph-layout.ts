// Where the boxes go, decided here rather than by the model.

import type { Character, CharacterRole, Relation } from "./types";

/** Rounds of force. All-pairs repulsion is O(n²), and n is at most 24. */
const ITERATIONS = 300;
/** Rounds of pushing overlapping boxes apart, after the forces have settled. */
const SEPARATION_PASSES = 80;
/** Where two people who are related come to rest. */
const EDGE_LENGTH = 150;
/** The pull back towards the middle, which keeps unrelated people from drifting. */
const GRAVITY = 0.03;

/** The shape the finished picture is fitted into. */
const TARGET_ASPECT = 2.1;
const TARGET_PER_NODE = 260;
const TARGET_MIN_WIDTH = 380;
const TARGET_MAX_WIDTH = 1100;

/** Clear space left between two boxes, and around the whole picture. */
const NODE_GAP = 34;
const PADDING = 32;

/** A main character's name is drawn larger, so its box is larger. */
const FONT_SIZE: Record<CharacterRole, number> = {
	main: 15,
	supporting: 13,
	minor: 12,
};

export interface Node {
	name: string;
	role: CharacterRole;
	x: number;
	y: number;
	width: number;
	height: number;
	fontSize: number;
}

export interface Edge {
	from: number;
	to: number;
	label: string;
	mutual: boolean;
}

export interface Bounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface Layout {
	nodes: Node[];
	edges: Edge[];
}

/** Where every box goes. */
export function layoutGraph(
	characters: Character[],
	relations: Relation[],
): Layout {
	const nodes = initialNodes(characters);
	const index = new Map(nodes.map((node, at) => [node.name, at]));

	const edges: Edge[] = [];
	for (const relation of relations) {
		const from = index.get(relation.from);
		const to = index.get(relation.to);
		// A stored line's two ends are foreign keys into the cast, so this cannot
		// miss; it is the name lookup the drawing needs either way.
		if (from === undefined || to === undefined || from === to) continue;
		edges.push({ from, to, label: relation.label, mutual: relation.mutual });
	}

	relax(nodes, edges);
	fit(nodes);
	separate(nodes);
	return { nodes, edges };
}

/** The starting ring, in the order the cast was written down. */
function initialNodes(characters: Character[]): Node[] {
	const count = Math.max(characters.length, 1);
	const radius = Math.max(140, count * 18);

	return characters.map((person, at) => {
		const angle = (at / count) * Math.PI * 2 - Math.PI / 2;
		const fontSize = FONT_SIZE[person.role];
		return {
			name: person.name,
			role: person.role,
			x: Math.cos(angle) * radius,
			y: Math.sin(angle) * radius,
			// One CJK character is about one em wide, and a Latin name is narrower
			// than this allows — which errs towards boxes that do not touch.
			width: person.name.length * fontSize + 28,
			height: fontSize + 20,
			fontSize,
		};
	});
}

/** Fruchterman–Reingold, with a temperature that cools to nothing. */
function relax(nodes: Node[], edges: Edge[]) {
	if (nodes.length < 2) return;
	const k = EDGE_LENGTH;

	for (let step = 0; step < ITERATIONS; step += 1) {
		const dx = new Array(nodes.length).fill(0);
		const dy = new Array(nodes.length).fill(0);

		for (const [a, one] of nodes.entries()) {
			for (const [b, other] of nodes.entries()) {
				if (b <= a) continue;
				let x = one.x - other.x;
				let y = one.y - other.y;
				let distance = Math.hypot(x, y);
				// Two boxes exactly on top of each other have no direction to be
				// pushed apart in; the offset gives them one.
				if (distance < 0.01) {
					x = (a - b) * 0.01;
					y = 0.01;
					distance = Math.hypot(x, y);
				}
				const force = (k * k) / distance;
				dx[a] += (x / distance) * force;
				dy[a] += (y / distance) * force;
				dx[b] -= (x / distance) * force;
				dy[b] -= (y / distance) * force;
			}
		}

		for (const edge of edges) {
			const from = nodes[edge.from];
			const to = nodes[edge.to];
			if (!from || !to) continue;
			const x = from.x - to.x;
			const y = from.y - to.y;
			const distance = Math.max(0.01, Math.hypot(x, y));
			const force = (distance * distance) / k;
			dx[edge.from] -= (x / distance) * force;
			dy[edge.from] -= (y / distance) * force;
			dx[edge.to] += (x / distance) * force;
			dy[edge.to] += (y / distance) * force;
		}

		const heat = (k / 4) * (1 - step / ITERATIONS);
		for (const [at, node] of nodes.entries()) {
			dx[at] -= node.x * GRAVITY * k;
			dy[at] -= node.y * GRAVITY * k;

			const distance = Math.max(0.01, Math.hypot(dx[at], dy[at]));
			const move = Math.min(distance, heat);
			node.x += (dx[at] / distance) * move;
			node.y += (dy[at] / distance) * move;
		}
	}
}

/** Scales the cloud of points into a box the right shape to read across. */
function fit(nodes: Node[]) {
	if (nodes.length < 2) return;

	const xs = nodes.map((node) => node.x);
	const ys = nodes.map((node) => node.y);
	const spanX = Math.max(...xs) - Math.min(...xs);
	const spanY = Math.max(...ys) - Math.min(...ys);
	if (spanX < 1 || spanY < 1) return;

	const width = Math.min(
		TARGET_MAX_WIDTH,
		Math.max(TARGET_MIN_WIDTH, TARGET_PER_NODE * Math.sqrt(nodes.length)),
	);
	const scale = Math.min(width / spanX, width / TARGET_ASPECT / spanY);

	for (const node of nodes) {
		node.x *= scale;
		node.y *= scale;
	}
}

/** Pushes overlapping boxes apart along whichever axis they overlap least in. */
function separate(nodes: Node[]) {
	for (let pass = 0; pass < SEPARATION_PASSES; pass += 1) {
		let moved = false;

		for (const [a, one] of nodes.entries()) {
			for (const [b, other] of nodes.entries()) {
				if (b <= a) continue;
				const overlapX =
					(one.width + other.width) / 2 + NODE_GAP - Math.abs(one.x - other.x);
				const overlapY =
					(one.height + other.height) / 2 +
					NODE_GAP -
					Math.abs(one.y - other.y);
				if (overlapX <= 0 || overlapY <= 0) continue;

				moved = true;
				if (overlapX < overlapY) {
					const push = (overlapX / 2) * (one.x <= other.x ? -1 : 1);
					one.x += push;
					other.x -= push;
				} else {
					const push = (overlapY / 2) * (one.y <= other.y ? -1 : 1);
					one.y += push;
					other.y -= push;
				}
			}
		}
		if (!moved) return;
	}
}

/** What the `viewBox` has to cover: every box, and a margin round the lot. */
export function boundsOf(nodes: Node[]): Bounds {
	if (nodes.length === 0) {
		return { x: 0, y: 0, width: 1, height: 1 };
	}
	let left = Number.POSITIVE_INFINITY;
	let top = Number.POSITIVE_INFINITY;
	let right = Number.NEGATIVE_INFINITY;
	let bottom = Number.NEGATIVE_INFINITY;

	for (const node of nodes) {
		left = Math.min(left, node.x - node.width / 2);
		top = Math.min(top, node.y - node.height / 2);
		right = Math.max(right, node.x + node.width / 2);
		bottom = Math.max(bottom, node.y + node.height / 2);
	}
	return {
		x: left - PADDING,
		y: top - PADDING,
		width: right - left + PADDING * 2,
		height: bottom - top + PADDING * 2,
	};
}

/** Where a line from `towards` meets this box's edge, so an arrow stops there. */
export function borderPoint(node: Node, towards: { x: number; y: number }) {
	const dx = towards.x - node.x;
	const dy = towards.y - node.y;
	if (dx === 0 && dy === 0) return { x: node.x, y: node.y };

	const halfWidth = node.width / 2 + 4;
	const halfHeight = node.height / 2 + 4;
	const scale = Math.min(
		dx === 0 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(dx),
		dy === 0 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(dy),
	);
	return { x: node.x + dx * scale, y: node.y + dy * scale };
}
