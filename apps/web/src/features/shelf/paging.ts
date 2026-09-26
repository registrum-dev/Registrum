// The shelf a page at a time.

/** The page sizes the shelf offers. */
export const PAGE_SIZES = [50, 100, 200] as const;

export type PageSize = (typeof PAGE_SIZES)[number];

export const DEFAULT_PAGE_SIZE: PageSize = 100;

/** The settings file's page size, or the default when it is not one of these. */
export function normalizePageSize(value: unknown): PageSize {
	return PAGE_SIZES.find((size) => size === value) ?? DEFAULT_PAGE_SIZE;
}

/** The last page a shelf of this many books has, counted from zero. */
export function lastPage(total: number, size: number): number {
	return Math.max(0, Math.ceil(total / size) - 1);
}

/** Which of the books this page is showing, counted from one. */
export function pageRange(
	page: number,
	size: number,
	total: number,
): { from: number; to: number } {
	return {
		from: Math.min(page * size + 1, total),
		to: Math.min((page + 1) * size, total),
	};
}

/** How many pages either side of this one get a number of their own. */
const AROUND = 1;

/**
 * The steps to draw: page numbers, with a `null` wherever a run of them was
 * left out. The two ends are always there, so the shelf always offers its far
 * edge in one press.
 */
export function pageSteps(page: number, last: number): (number | null)[] {
	const wanted = new Set([0, last]);
	for (let step = page - AROUND; step <= page + AROUND; step += 1) {
		if (step >= 0 && step <= last) wanted.add(step);
	}

	const steps: (number | null)[] = [];
	let previous: number | null = null;
	for (const step of [...wanted].sort((a, b) => a - b)) {
		if (previous !== null && step - previous > 1) steps.push(null);
		steps.push(step);
		previous = step;
	}
	return steps;
}
