// Everything the web app reads from this package: the words a record uses, and
// the shapes that cross the API. Only type exports reach into the server code,
// so bundling this for the browser takes in nothing but the lists below.

export type { Chapter, Chapters } from "./ai/chapters";
export type { Generated, Usage } from "./ai/client";
export type { SentNotice } from "./ai/generations";
export type { Asked } from "./ai/index";
export { MAX_EXAMPLES, MAX_QUESTION } from "./ai/limits";
export type { Lookup } from "./ai/lookup";
export type { PatternDraft, PatternExample } from "./ai/pattern";
export type { Locale, Speaker, Turn } from "./ai/prompt";
export type { AiSettings } from "./ai/settings";
export { FAILURE_CODES, type FailureCode, type FailureShape } from "./failure";
export type { Bookmark, BookmarkInput } from "./library/bookmark";
export type { Character, Relation, SavedAi } from "./library/character";
export type { FacetEntry, SeriesFacet, ShelfFacets } from "./library/facets";
export type { ComicBook } from "./library/files";
export type { BookPatch } from "./library/patch";
export type { PositionInput } from "./library/position";
export type {
	BookFilter,
	BookPage,
	FilterField,
	Paging,
	SortKey,
	SortOrder,
} from "./library/query";
export type { BookRecord, ReadingPosition } from "./library/record";
export type { Renamed } from "./library/rename";
export type {
	FieldRule,
	FieldTally,
	PathPiece,
	PathRule,
	RuleApplied,
	RuleBook,
	RuleChange,
	RuleOutcome,
	RulePreview,
	RuleSkip,
	RuleTarget,
	RuleValue,
} from "./library/rule";
export type { ScanProgress, ScanReport } from "./library/scan";
export type { Folder, Listing, Shelf } from "./library/shelf";
export type { FoundVolume } from "./lookup/google-books";
export type { BookIdentifier } from "./util/identifier";
export * from "./vocabulary";
