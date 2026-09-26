// The way into the path rule.

import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import { useRuleStore } from "./store";

/** Opens the rule on these books, or on the whole shelf when none are given. */
export function useOpenRule(): (ids?: string[]) => void {
	const navigate = useNavigate();
	return useCallback(
		(ids: string[] = []) => {
			useRuleStore.getState().handOver(ids);
			void navigate({ to: "/rule" });
		},
		[navigate],
	);
}
