/** Holds only when a list names exactly the words the server knows. */
export type SameWords<Sent, Listed> =
	Exclude<Sent, Listed> extends never
		? Exclude<Listed, Sent> extends never
			? true
			: { listsAWordTheServerDoesNotKnow: Exclude<Listed, Sent> }
		: { serverKnowsAWordTheListLeavesOut: Exclude<Sent, Listed> };

/** Reads a `SameWords` contract, and fails to compile when it does not hold. */
export type Holds<T extends true> = T;
