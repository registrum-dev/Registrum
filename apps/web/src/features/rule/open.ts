// The way into the path rule.

import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import { useRule } from "./store";

/** Opens the rule on these books, or on the whole library when none are given. */
export function useOpenRule(): (ids?: string[]) => void {
	const navigate = useNavigate();
	return useCallback(
		(ids: string[] = []) => {
			useRule.getState().handOver(ids);
			void navigate({ to: "/rule" });
		},
		[navigate],
	);
}
