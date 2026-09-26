// What is stacked over what on a phone.
//
// Nothing here runs per frame. Each layer names a view timeline on its own
// surface; the layer under it runs its step-back on that timeline, and the
// compositor moves both off the one scroll.

import { type CSSProperties, useLayoutEffect, useState } from "react";
import { create } from "zustand";

/** As many timeline names as `timeline-scope` on <body> declares. */
const SLOTS = 8;

interface Entry {
	key: object;
	slot: number;
	/** The stretch of this layer's timeline over which it steps back what is under it. */
	push: string | null;
}

export interface Above {
	name: string;
	push: string;
}

/** The layers, bottom first. */
const useStack = create<{ entries: Entry[] }>(() => ({ entries: [] }));

const entriesNow = () => useStack.getState().entries;

function publish(entries: Entry[]) {
	useStack.setState({ entries });
}

const timelineName = (slot: number) => `--layer-${slot}`;

function aboveOf(list: Entry[], at: number): Above | null {
	const over = list[at + 1];
	return over?.push ? { name: timelineName(over.slot), push: over.push } : null;
}

/**
 * Stands on the stack for as long as the component is mounted — through its
 * exit, so what is under it comes forward as it leaves. The order is the order
 * layers arrive in. Answers this layer's timeline name, and what is over it.
 */
export function useStackLayer(push: string | null, active = true) {
	const [key] = useState(() => ({}));
	const list = useStack((state) => state.entries);

	useLayoutEffect(() => {
		if (!active) return;
		const entries = entriesNow();
		const taken = new Set(entries.map((entry) => entry.slot));
		let slot = 1;
		while (taken.has(slot) && slot < SLOTS) slot += 1;
		publish([...entries, { key, slot, push }]);
		return () => publish(entriesNow().filter((entry) => entry.key !== key));
	}, [key, push, active]);

	const at = list.findIndex((entry) => entry.key === key);
	const entry = list[at];
	return {
		name: entry ? timelineName(entry.slot) : undefined,
		above: entry ? aboveOf(list, at) : null,
	};
}

/** What is over the shelf, which is under everything and never joins. */
export function useShelfAbove(): Above | null {
	return aboveOf(
		useStack((state) => state.entries),
		-1,
	);
}

/** Whether nothing stands over the shelf. */
export function useStackEmpty(): boolean {
	return useStack((state) => state.entries.length === 0);
}

/** The custom properties a `.screen-stepped` or `.sheet-stepped` box reads. */
export function aboveStyle(above: Above | null): CSSProperties | undefined {
	if (!above) return undefined;
	return { "--above": above.name, "--above-push": above.push } as CSSProperties;
}
