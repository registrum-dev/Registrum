// The row of a list the arrow keys are on, while the focus stays in the text
// box above it (`aria-activedescendant`).

import { useState } from "react";

/**
 * Which of `count` rows is active, moved by ArrowUp and ArrowDown and picked
 * with Enter. `restart` puts it back on the first row, as typing should.
 */
export function useActiveOption(
	count: number,
	pick: (index: number) => void,
	/** Keeps the row just moved to in sight, where the list scrolls. */
	reveal?: (index: number) => void,
) {
	const [active, setActive] = useState(0);
	const index = Math.min(active, Math.max(0, count - 1));

	const onKeyDown = (event: React.KeyboardEvent) => {
		const move = (to: number) => {
			event.preventDefault();
			const next = Math.max(0, Math.min(count - 1, to));
			setActive(next);
			reveal?.(next);
		};
		if (event.key === "ArrowDown") move(index + 1);
		else if (event.key === "ArrowUp") move(index - 1);
		else if (event.key === "Enter" && count > 0) {
			event.preventDefault();
			pick(index);
		}
	};

	return { active: index, restart: () => setActive(0), onKeyDown };
}
