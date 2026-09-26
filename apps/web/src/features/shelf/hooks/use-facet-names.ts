import { useMemo } from "react";
import { namesOf } from "@/features/shelf/filter";
import { useFacets } from "@/features/shelf/queries";
import type { FacetKind } from "@/features/shelf/types";

/** What the shelf already calls things of one kind, most-used first. */
export function useFacetNames(kind: FacetKind): string[] {
	const facets = useFacets();
	return useMemo(
		() => namesOf(facets, kind).map((entry) => entry.name),
		[facets, kind],
	);
}
