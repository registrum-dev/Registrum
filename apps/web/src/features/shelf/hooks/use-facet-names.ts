import { useMemo } from "react";
import { useNames } from "@/features/shelf/queries";
import type { FacetKind } from "@/features/shelf/types";

/** What the shelf already calls things of one kind, most-used first. */
export function useFacetNames(kind: FacetKind): string[] {
	const { data } = useNames(kind);
	return useMemo(() => (data ?? []).map((entry) => entry.name), [data]);
}
