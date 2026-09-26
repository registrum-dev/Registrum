// What a sheet keeps showing on its way out.

import { useState } from "react";

/**
 * `value` while `keep` holds, and the last value it had then once it no longer
 * does: a sheet the route has stopped naming leaves showing what it showed.
 */
export function useRetainedValue<T>(keep: boolean, value: T): T {
	const [last, setLast] = useState(value);
	if (keep && value !== last) setLast(value);
	return keep ? value : last;
}
