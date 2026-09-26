import { useMemo } from "react";

import { useFacets } from "@/features/library/queries";
import { namesOf } from "@/features/library/query";
import type { NameKind } from "@/features/library/types";

/** What the library already calls things of one kind, most-used first. */
export function useNames(kind: NameKind): string[] {
	const facets = useFacets();
	return useMemo(
		() => namesOf(facets, kind).map((entry) => entry.name),
		[facets, kind],
	);
}
