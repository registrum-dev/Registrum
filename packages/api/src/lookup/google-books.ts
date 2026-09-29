// Google Books, read without signing in. Without a key every server shares one
// quota, which is often spent.

import { z } from "zod";

import { Failure } from "../failure";
import { clip } from "../lib/text";

const BASE = "https://www.googleapis.com/books/v1/volumes";

/** How long one request may take before it counts as failed. */
const TIMEOUT_MS = 15_000;

/** How many results one search hands the model. */
const RESULTS = 10;

/** How much of a description a search result carries: enough to tell two
 *  books apart, not the whole of it. */
const SNIPPET = 160;

const volumeSchema = z.object({
	id: z.string(),
	volumeInfo: z
		.object({
			title: z.string().optional(),
			subtitle: z.string().optional(),
			authors: z.array(z.string()).optional(),
			publisher: z.string().optional(),
			publishedDate: z.string().optional(),
			description: z.string().optional(),
			industryIdentifiers: z
				.array(z.object({ type: z.string(), identifier: z.string() }))
				.optional(),
			pageCount: z.number().optional(),
			language: z.string().optional(),
			infoLink: z.string().optional(),
		})
		.default({}),
});
type Volume = z.infer<typeof volumeSchema>;

const searchSchema = z.object({
	items: z.array(volumeSchema).optional(),
});

/** One search result, as the model is shown it. */
export interface VolumeSummary {
	id: string;
	title: string;
	subtitle: string | null;
	authors: string[];
	publisher: string | null;
	published: string | null;
	isbn: string | null;
	language: string | null;
	pages: number | null;
	description: string | null;
}

/** The volume the model picked, as the reader is offered it. */
export interface FoundVolume {
	volumeId: string;
	link: string | null;
	title: string;
	subtitle: string | null;
	authors: string[];
	publisher: string | null;
	published: string | null;
	description: string | null;
	identifier: string | null;
	language: string | null;
}

async function get(url: URL, signal: AbortSignal): Promise<unknown> {
	let response: Response;
	try {
		response = await fetch(url, {
			signal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
		});
	} catch (error) {
		if (signal.aborted) throw Failure.bare("aiStopped");
		throw new Failure("lookupCall", error);
	}
	if (!response.ok) {
		const said = await response
			.json()
			.then(
				(body) => (body as { error?: { message?: unknown } }).error?.message,
			)
			.catch(() => null);
		throw new Failure(
			"lookupCall",
			typeof said === "string" && said
				? `${response.status} ${said}`
				: `${response.status} ${response.statusText}`.trim(),
		);
	}
	return response.json();
}

/** What Google answered, read as `schema`. An answer of another shape is
 *  Google's failure, not the shelf's. */
function read<T>(schema: z.ZodType<T>, answer: unknown): T {
	const parsed = schema.safeParse(answer);
	if (!parsed.success) throw new Failure("lookupCall", parsed.error);
	return parsed.data;
}

function withKey(url: URL, apiKey: string): URL {
	if (apiKey) url.searchParams.set("key", apiKey);
	return url;
}

function text(value: string | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

/** ISBN-13 over ISBN-10: the one a shelf is more likely to hold already. */
function isbnOf(volume: Volume): string | null {
	const ids = volume.volumeInfo.industryIdentifiers ?? [];
	return (
		ids.find((id) => id.type === "ISBN_13")?.identifier ??
		ids.find((id) => id.type === "ISBN_10")?.identifier ??
		null
	);
}

/** Up to ten volumes for a query in Google's own syntax. */
export async function searchVolumes(
	query: string,
	apiKey: string,
	signal: AbortSignal,
): Promise<VolumeSummary[]> {
	const url = new URL(BASE);
	url.searchParams.set("q", query);
	url.searchParams.set("maxResults", String(RESULTS));
	url.searchParams.set("printType", "books");
	const found = read(searchSchema, await get(withKey(url, apiKey), signal));
	return (found.items ?? []).map((volume) => {
		const info = volume.volumeInfo;
		const description = text(info.description);
		return {
			id: volume.id,
			title: info.title ?? "",
			subtitle: text(info.subtitle),
			authors: info.authors ?? [],
			publisher: text(info.publisher),
			published: text(info.publishedDate),
			isbn: isbnOf(volume),
			language: text(info.language),
			pages: info.pageCount ?? null,
			description: description && clip(description, SNIPPET),
		};
	});
}

/** One volume in full. A search result's description can be cut short; this
 *  one is not. */
export async function getVolume(
	id: string,
	apiKey: string,
	signal: AbortSignal,
): Promise<FoundVolume> {
	const url = new URL(`${BASE}/${encodeURIComponent(id)}`);
	const volume = read(volumeSchema, await get(withKey(url, apiKey), signal));
	const info = volume.volumeInfo;
	return {
		volumeId: volume.id,
		link: text(info.infoLink),
		title: info.title?.trim() ?? "",
		subtitle: text(info.subtitle),
		authors: (info.authors ?? []).map((name) => name.trim()).filter(Boolean),
		publisher: text(info.publisher),
		published: text(info.publishedDate),
		description: text(info.description),
		identifier: isbnOf(volume),
		language: text(info.language),
	};
}
