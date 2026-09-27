// What the page and the save worker say to each other.

export type SaveRequest =
	| { type: "save"; job: number; id: string; url: string; record: string }
	| { type: "record"; job: number; id: string; record: string }
	| { type: "cancel"; job: number };

export type SaveReply =
	| { type: "progress"; job: number; fraction: number }
	| { type: "done"; job: number }
	| { type: "failed"; job: number; cancelled: boolean; message: string };
