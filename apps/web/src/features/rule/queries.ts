// Asking for a path rule's preview, and writing it.

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { libraryChanged } from "@/features/library/cache";
import { useFacets, useShelf, useShelfId } from "@/features/library/queries";
import { isFiltered } from "@/features/library/query";
import { useLibrary } from "@/features/library/store";
import { useDebounced } from "@/hooks/use-debounced";
import { api, trpc } from "@/lib/api";

import { RULE_FIELDS } from "./fields";
import type { PathRule, RuleTarget } from "./ipc";
import { type RuleScope, useRule } from "./store";

/** How long typing has to pause before the preview is asked for again. */
const SETTLE_MS = 250;

/** A scope the form can offer, and how many books it holds. */
export interface ScopeChoice {
	scope: RuleScope;
	count: number;
}

/** The scopes there is something to offer for, the one standing (the one
 *  chosen, or the whole library once that is no longer offered), and the
 *  question it is. */
export function useRuleTarget(): {
	choices: ScopeChoice[];
	scope: RuleScope;
	target: RuleTarget;
} {
	const scope = useRule((state) => state.scope);
	const ids = useRule((state) => state.ids);
	const query = useLibrary((state) => state.query);
	const facets = useFacets();
	const shelf = useShelf();

	return useMemo(() => {
		const choices: ScopeChoice[] = [{ scope: "library", count: facets.total }];
		if (isFiltered(query))
			choices.push({ scope: "shelf", count: shelf.data?.total ?? 0 });
		if (ids.length) choices.push({ scope: "books", count: ids.length });

		const offered = choices.some((choice) => choice.scope === scope)
			? scope
			: "library";
		const target: RuleTarget =
			offered === "books"
				? { kind: "books", ids }
				: { kind: "shelf", query: offered === "shelf" ? query : {} };
		return { choices, scope: offered, target };
	}, [scope, ids, query, facets.total, shelf.data?.total]);
}

/** The rule as it is sent: only the fields that are ticked and say something. */
export function useRuleDraft(): PathRule {
	const pattern = useRule((state) => state.pattern);
	const fields = useRule((state) => state.fields);
	return useMemo(
		() => ({
			pattern,
			fields: RULE_FIELDS.filter(
				(field) => fields[field].on && fields[field].template.trim(),
			).map((field) => ({
				field,
				template: fields[field].template,
				mode: fields[field].mode,
			})),
		}),
		[pattern, fields],
	);
}

/** What the rule would write. Held back while the pattern is empty and while
 *  the page is not up. */
export function useRulePreview(
	target: RuleTarget,
	rule: PathRule,
	active: boolean,
) {
	const { shelfId, asking } = useShelfId();
	const asked = useDebounced(
		useMemo(() => ({ target, rule }), [target, rule]),
		SETTLE_MS,
	);

	const preview = useQuery(
		trpc.rule.preview.queryOptions(
			{ shelfId, target: asked.target, rule: asked.rule },
			{
				enabled: active && asking && asked.rule.pattern !== "",
				placeholderData: keepPreviousData,
				// A pattern that does not read is drawn under the field, not in the
				// banner.
				meta: { failure: null },
			},
		),
	);
	/** Whether what is on screen answers the rule as it is typed now. */
	const settled =
		asked.target === target && asked.rule === rule && !preview.isFetching;
	return { preview, settled };
}

/** The paths the rule would run over, for the example picker. Asked for only
 *  while the picker can be used. */
export function useRulePaths(target: RuleTarget, active: boolean) {
	const { shelfId, asking } = useShelfId();
	return useQuery(
		trpc.rule.paths.queryOptions(
			{ shelfId, target },
			{ enabled: active && asking, placeholderData: keepPreviousData },
		),
	);
}

/** Writes the rule, and says the library's answers are out of date. */
export function useApplyRule() {
	const { shelfId } = useShelfId();
	return useMutation({
		mutationFn: ({ target, rule }: { target: RuleTarget; rule: PathRule }) =>
			api.rule.write.mutate({ shelfId, target, rule }),
		onSuccess: () => libraryChanged(shelfId),
		meta: { failure: "save" },
	});
}
