import type { ja } from "./ja";

/**
 * Every plural form a language has. Japanese has one, `_other`; English has
 * `_one` besides.
 */
type EnglishPlural<K> = K extends `${infer Word}_other` ? `${Word}_one` | K : K;

/** Every catalogue carries the same keys; only the words, and the plural forms, differ. */
type Catalogue<T> = {
	[K in keyof T as EnglishPlural<K>]: T[K] extends string
		? string
		: Catalogue<T[K]>;
};

export const en = {
	app: {
		name: "Registrum",
		settingsWindowTitle: "Settings — Registrum",
	},

	common: {
		empty: "—",
		loading: "Loading…",
		done: "Done",
		apply: "Apply",
		close: "Close",
		copy: "Copy",
		copied: "Copied",
		cancel: "Cancel",
		save: "Save",
		delete: "Delete",
		stop: "Stop",
		openFile: "Open a file",
		bookCount_one: "{{count}} book",
		bookCount_other: "{{count}} books",
		listSeparator: ", ",
		dotSeparator: " · ",
		unknownAuthor: "Unknown author",
		notRated: "Not rated",
		dropToOpen: "Drop to open",
		unsupportedDrop:
			"That format is not supported. Drop an EPUB, PDF, CBZ or ZIP.",
	},

	error: {
		db: "Could not read or write the shelf: {{message}}",
		noShelf: "That shelf is no longer there.",
		shelfTaken: "This folder is a shelf already ({{message}}).",
		shelfName: "Give the shelf a name of 1 to 80 characters.",
		aiNotConfigured:
			"Set AI_BASE_URL and AI_MODEL in the server's environment.",
		noFolder: "The folder could not be found.",
		readFolder: "Could not read the folder: {{message}}",
		save: "Could not save: {{message}}",
		emptyName: "A name cannot be empty.",
		noName: "The shelf no longer has that name.",
		badId: "Not usable as a book id: {{message}}",
		badPath: "Not usable as a book's location: {{message}}",
		badPattern: "Not a regular expression: {{message}}",
		readBook: "Could not read the book's file: {{message}}",
		notEpub: "This file could not be read as an EPUB.",
		noPages: "The archive holds no images.",
		noBook: "No such book.",
		noBookText: "This book has no text to read. Only EPUB carries any.",
		noCharacters: "Generate the characters first.",
		noChapters: "The chapters you picked have no text to send.",
		noQuestion: "The question was empty.",
		noExample: "None of the examples has a value written in.",
		badExample: "“{{message}}” in an example cannot be a value of its field.",
		aiCall: "The AI call failed: {{message}}",
		aiUnreadable: "The AI's answer could not be read: {{message}}",
		aiEmpty: "The AI returned nothing.",
		aiStopped: "The request to the AI was stopped.",
		loadShelf: "Could not load the shelf: {{message}}",
		chooseFile: "Could not choose a file: {{message}}",
		removeRecord: "Could not delete the metadata: {{message}}",
		indexFailed_one: "“{{books}}” could not be read.",
		indexFailed_other: "{{count}} books could not be read: {{books}}",
		rescanFailed_one: "“{{books}}” could not be read again.",
		rescanFailed_other: "{{count}} books could not be read again: {{books}}",
		andMore_one: "and {{count}} more",
		andMore_other: "and {{count}} more",
	},

	language: {
		auto: "System",
		ja: "日本語",
		en: "English",
	},

	characterRole: {
		main: "Main",
		supporting: "Supporting",
		minor: "Minor",
	},

	ai: {
		title: "AI",
		baseUrl: "Endpoint",
		model: "Model",
		apiKey: "API key",
		apiKeySet: "Set",
		unset: "Not set",
		envHint:
			"Set by the server's AI_BASE_URL, AI_MODEL and AI_API_KEY environment variables. The key is never sent to a browser.",
		notConfiguredHint:
			"Set AI_BASE_URL and AI_MODEL (and AI_API_KEY if the endpoint wants one) in the server's environment, then restart it.",

		generate: "Write with AI",
		again: "Write again",
		reading: "Reading the book…",
		sent: "Sent the whole book: {{chars}} characters",
		elapsed: "{{seconds}}s",
		usage: "{{tokens}} tokens · {{model}}",
		wholeBookNote:
			"This is written from the whole book, so people and events you have not reached will appear.",
		notConfigured:
			"Set AI_BASE_URL and AI_MODEL in the server's environment to use this.",

		synopsisTitle: "Write a synopsis",
		synopsisNote:
			"Sends the whole book and asks for a synopsis that does not give the ending away. Nothing replaces the current one until you say so.",
		replaceWarning:
			"The synopsis this book already has cannot be brought back once replaced.",
		keepSynopsis: "Use as the synopsis",

		characters: "Characters",
		charactersNote:
			"Sends the whole book and asks who is in it, and what happens to them in this volume.",
		noCharacters: "Nothing written yet",
		overview: "Who they are",
		personality: "Personality",
		appearance: "Appearance",
		speech: "How they talk",
		affiliation: "Affiliation",
		events: "What happens in this volume",

		map: "Character map",
		mapNote:
			"Draws only the ties between them, and leaves out anything the later half of the story reveals.",
		noMap: "Nothing drawn yet",
		mapIntro:
			"Sends the whole book and asks how the people listed above stand to one another.",
		mapOf: "A map of {{count}} characters",

		ask: "Ask the AI",
		askNote:
			"Only the chapters you pick are sent. Nothing from the others reaches the answer, and the exchange is gone once you leave the screen.",
		askPlaceholder: "Ask about this book",
		askIntro:
			"Pick chapters and ask. An answer is drawn from those chapters and nothing else, and the exchange is not kept.",
		noAsking: "Nothing to ask with yet",
		send: "Send",
		clearChat: "Clear this conversation",
		pickChapters: "Pick chapters",
		pickChaptersFirst: "Pick the chapters to send",
		loadingChapters: "Reading the chapters…",
		willSend: "Sending {{names}}",
		basedOn: "Answered from {{names}}",
		sentChapters: "Sent {{chars}} characters from the chapters you picked",
		sectionNumber: "Section {{number}}",
		charCount: "{{chars}} characters",
		chapterCount_one: "{{count}} chapter",
		chapterCount_other: "{{count}} chapters",
		chaptersPicked: "{{picked}} / {{total}} chapters",
		moreChapters_one: "{{names}} and {{count}} more chapter",
		moreChapters_other: "{{names}} and {{count}} more chapters",
		selectAll: "Select all",
		clearAll: "Clear all",
	},

	category: {
		novel: "Novel",
		manga: "Manga",
		doujinshi: "Doujinshi",
		academic: "Academic",
		practical: "Practical",
		other: "Other",
	},

	status: {
		unread: "Unread",
		reading: "Reading",
		finished: "Finished",
	},

	bookLayout: {
		reflowable: "Reflowable",
		"pre-paginated": "Fixed layout",
		format: "{{format}} · {{layout}}",
	},

	direction: {
		left: "Next is left",
		right: "Next is right",
	},

	theme: {
		light: "Light",
		sepia: "Sepia",
		dark: "Dark",
	},

	font: {
		fromBook: "Follow the book",
		yuMincho: "Yu Mincho",
		yuGothic: "Yu Gothic",
		bizMincho: "BIZ UDPMincho",
		bizGothic: "BIZ UDPGothic",
		meiryo: "Meiryo",
		msMincho: "MS Mincho",
		msGothic: "MS Gothic",
	},

	column: {
		book: "Book",
		category: "Category",
		marks: "Marks",
		reading: "Reading",
		dates: "Dates",
		publishing: "Publishing",
		collection: "Collection",
		tag: "Tag",
		file: "File",
	},

	field: {
		title: "Title",
		author: "Author",
		series: "Series",
		seriesIndex: "Vol.",
		collection: "Collection",
		tag: "Tag",
		publisher: "Publisher",
		published: "Published",
		category: "Category",
		format: "Format",
		status: "Status",
		favorite: "Favourite",
		rating: "Rating",
		progress: "Progress",
		lastOpened: "Last read",
		added: "Added",
		size: "Size",
		path: "File",
	},

	order: {
		asc: "Ascending",
		desc: "Descending",
	},

	shelf: {
		back: "Back to the shelf",
		favorite: "Favourites",
		heading: "Shelf",
		name: "Shelf name",
		remove: "Delete shelf",
		removeNote:
			"Deletes the records (ratings, notes, reading positions) and covers. The book files are not touched.",
		removeTitle: "Delete “{{name}}”?",
		removeDescription:
			"Every record on this shelf is deleted. The book files stay where they are, so making the folder a shelf again and scanning brings the metadata back, but not ratings, notes, tags or reading positions.",
		removed: "Deleted “{{name}}”.",
		shownOfTotal: "{{shown}} / {{total}} books",
		shelves: "Shelves",
		switch: "Switch shelf",
		otherFolder: "Use another folder…",
		gone: "Not found: {{folder}}",
		total: "Books",
		moreActions: "More actions",
		view: "View",
		sortOrder: "Order",
		sortDirection: "Direction",
		columns: "Columns",
		showAsGrid: "Show covers",
		showAsTable: "Show as a table",
		searchPlaceholder: "Title, author, series",
		searchLabel: "Search the shelf",
		clearSearch: "Clear the shelf's search",
		readBook: "Read {{title}}",
		readNow: "Read now",
	},

	view: {
		grid: "Covers",
		table: "Table",
	},

	scan: {
		lastLabel: "Last scan",
		never: "Never scanned",
		running: "Scanning…",
		again: "Scan again",
		progress: "Scan progress",
		start: "Start a scan",
	},

	shelfEmpty: {
		filteredTitle: "No books match",
		unscannedTitle: "Nothing has been scanned yet",
		emptyTitle: "No books here",
		filtered: "Try changing the search or the conditions.",
		scanning: "Reading the folder…",
		unscanned:
			"Scan, and the EPUB, PDF and CBZ files in this folder will line up here.",
		empty: "This folder held no EPUB, PDF or CBZ files.",
	},

	shelfUnopened: {
		title: "The shelf could not be opened",
		description: "The server is not answering. Check that it is running.",
		retry: "Try again",
	},

	shelfSetup: {
		title: "Make a shelf",
		stepFolder: "Folder",
		stepName: "Shelf name",
		stepSettled: "Settled",
		decided: "Chosen",
		nameLater: "Once the folder is chosen, the shelf is named here.",
		isShelf: "Shelf",
		knownTitle: "This folder is a shelf already",
		knownNote: "It opens as it is, with the name it already has.",
		shelfName: "Name",
		shelfNamePlaceholder: "e.g. Novels",
		shelfNameNote:
			"The books in {{folder}} go on this shelf. The name can be changed later in Settings.",
		shelfDefaultName: "Books",
		open: "Open this shelf",
		formats: "Reads EPUB · PDF · CBZ · ZIP.",
	},

	browse: {
		up: "Up",
		noFolders: "No folders in here",
		unreadable: "This folder cannot be read",
	},

	filter: {
		title: "Filter",
		status: "Status",
		allStatuses: "All",
		clearAll: "Clear all",
		unset: "Clear",
		clearField: "Clear the {{field}} condition",
		chosenCount_one: "{{count}} chosen",
		chosenCount_other: "{{count}} chosen",
		noSeries: "No series",
		missing: "Missing files",
		missingHint: "Books whose file the last scan could not find",
		search: "Search {{field}}",
		searchAmong_one: "Search {{count}} name",
		searchAmong_other: "Search {{count}} names",
		anyOf: "A book matching any one stays",
		notFound: "Nothing contains “{{text}}”",
		nothingYet: "None yet",
		unreached_one: "None under the other conditions ({{count}})",
		unreached_other: "None under the other conditions ({{count}})",
		searchEverywhere: "Search everything for “{{text}}”",
		suggestHint: "Choosing a name filters by it",
		fields: {
			author: "Author",
			publisher: "Publisher",
			series: "Series",
			collection: "Collection",
			tag: "Tag",
			category: "Category",
			rating: "Rating",
			format: "Format",
		},
	},

	table: {
		selectAll: "Select every book shown",
		selectBook: "Select {{title}}",
		resizeColumn: "Resize the {{column}} column",
	},

	pager: {
		label: "Pages",
		range: "{{from}}–{{to}} of {{total}}",
		previous: "Previous page",
		next: "Next page",
		page: "Page {{page}}",
		gap: "…",
		perPage: "Books per page",
	},

	ruleField: {
		title: "Title",
		authors: "Authors",
		series: "Series",
		seriesIndex: "Volume",
		publisher: "Publisher",
		published: "Published",
		tags: "Tags",
		collections: "Collections",
		category: "Category",
	},

	ruleMode: {
		overwrite: "Replace",
		empty: "Only if empty",
		append: "Add",
	},

	rule: {
		title: "Fill in from paths",
		fromSelection: "Fill in from paths",
		target: "Books",
		targetShelf: "The whole shelf",
		targetFiltered: "The filtered shelf",
		targetSelected: "The selected books",
		pattern: "Pattern",
		patternHint: "Matched against the path inside the shelf's folder",
		groups: "Values",
		noGroups:
			"Write a named group (?<name>…) to use what it catches in a field",
		fields: "Fields to fill",
		fieldsChosen_one: "{{count}} field chosen",
		fieldsChosen_other: "{{count}} fields chosen",
		fieldValue: "What to write into {{field}}",
		fieldMode: "How to write {{field}}",
		fieldsHint:
			"Separate authors, tags and collections with “,” or “、” to write several. Write a category by its name, such as “Manga” or “Novel”.",
		preview: "What will be written",
		previewNote: "Nothing has been written yet",
		all: "All",
		noPattern: "Write a pattern to see what each book would get",
		badPattern: "Not a regular expression",
		fixPattern: "Fix the pattern to see the results here",
		noBooks: "No books here",
		more: "{{count}} more",
		writeTally_one: "{{count}} book, {{cells}} fields to write",
		writeTally_other: "{{count}} books, {{cells}} fields to write",
		nothingToWrite: "Nothing to write",
		overwrites: "Replaces {{count}} values already there",
		write: "Write…",
		confirmTitle_one: "Write to {{count}} book?",
		confirmTitle_other: "Write to {{count}} books?",
		confirmDescription:
			"{{fields}}. Books the pattern missed and books that stay the same are left alone. A scan keeps what is written; a book's Restore puts back what its file says.",
		fieldTally: "{{field}}: {{count}}",
		fieldTallyOverwrite: "{{field}}: {{count}} ({{overwrites}} replaced)",
		confirm: "Write",
		applied_one: "Wrote to {{count}} book",
		applied_other: "Wrote to {{count}} books",
		notNumber: "“{{value}}” is not a number, so it is left out",
		notCategory: "“{{value}}” is not a category, so it is left out",

		askTitle: "Ask the AI",
		askHint:
			"Pick example books and write the values you want out of them. The AI writes the pattern.",
		askNote:
			"Sends the examples and about 30 paths from these books. No book contents are sent.",
		askFields: "Fields to take",
		addExample: "Find a book to use as an example",
		noPaths: "No paths match",
		removeExample: "Remove the example",
		useAsExample: "Use as example",
		exampleValue: "What {{field}} should be",
		ask: "Write the pattern",
		asking: "Thinking…",
		askNeedsValues: "Write at least one value into an example",
		askFitted: "Filled in a pattern that fits every example",
		askFittedAfter:
			"Filled in a pattern that fits every example, on attempt {{attempts}}",
		askMissed_one:
			"Filled in a pattern that still misses {{count}} example. Check the preview",
		askMissed_other:
			"Filled in a pattern that still misses {{count}} examples. Check the preview",
	},

	ruleOutcome: {
		changed: "Changes",
		unchanged: "Same",
		missed: "Missed",
	},

	bulk: {
		clearPosition: "Clear history",
		clearPositionTitle_one: "Clear the reading history of {{count}} book?",
		clearPositionTitle_other: "Clear the reading history of {{count}} books?",
		selected_one: "{{count}} book selected",
		selected_other: "{{count}} books selected",
		edit: "Edit together",
		clearSelection: "Clear the selection",
		rescanTitle_one: "Read {{count}} book from its file again?",
		rescanTitle_other: "Read {{count}} books from their files again?",
		removeTitle_one: "Remove {{count}} book from the shelf?",
		removeTitle_other: "Remove {{count}} books from the shelf?",
		title_one: "Edit {{count}} book",
		title_other: "Edit {{count}} books together",
		description_one:
			"Only the ticked fields are written to the book you chose. The volume is the one field each book can have its own. Fields that differ book by book — the title, the description, the note — are edited from the pencil on the row.",
		description_other:
			"Only the ticked fields are written, with the same value, to all {{count}} books. The volume is the one field each book can have its own. Fields that differ book by book — the title, the description, the note — are edited from the pencil on the row.",
		volumePerBook: "Volume (per book)",
		volumeOf: "Volume of {{title}}",
		makeFavorite: "Make a favourite",
		clearFavorite: "Remove from favourites",
		apply_one: "Apply to {{count}} book",
		apply_other: "Apply to {{count}} books",
	},

	book: {
		none: "None",
		missing: "Not found",
		fileMissing: "The file is missing",
		editBook: "Edit {{title}}",
		favorite: "Add {{title}} to favourites",
		unfavorite: "Remove {{title}} from favourites",
		setRating: "Give {{title}} {{rating}} stars",
		clearRating: "Clear the rating of {{title}}",
		noSuggestions: "No suggestions",
		addName: "Add “{{name}}”",
		authorsPlaceholder: "Type a name and press Enter",
		collectionsPlaceholder: "Type a collection name and press Enter",
		tagsPlaceholder: "Type a word and press Enter",
		rescan: "Restore",
		rescanConfirm: "Read again",
		rescanDescription:
			"The title, author, publisher, series and description go back to what the book's own file says. Corrections made by hand cannot be recovered. Collections, tags, category, note, rating and reading position are kept.",
		removeDescription:
			"The edits, the rating and the reading position are deleted. The book's own file is not. The next scan reads it from the file again and puts it back on the shelf.",
		pagePosition: "Page {{at}} of {{total}}",
		sectionPosition: "Section {{at}} of {{total}}",
	},

	facet: {
		sheet: "Name details",
		open: "Show the books under “{{name}}”",
		backToBook: "Back to the book",
		standAt: "See on the shelf",
		rename: "Name",
		renameHint:
			"Changing this name changes it on every book that carries it. The book files are left alone.",
		taken: "“{{name}}” already exists. Saving will join the two into one.",
		mergeTitle: "Join “{{from}}” into “{{to}}”?",
		mergeDescription_one:
			"“{{from}}” goes, and its {{count}} book moves to “{{to}}”. This cannot be undone.",
		mergeDescription_other:
			"“{{from}}” goes, and its {{count}} books move to “{{to}}”. This cannot be undone.",
		merge: "Join them",
		merged: "“{{from}}” was joined into “{{to}}”.",
		books: "Books under this name",
		goneTitle: "This name is gone",
		gone: "No book carries it any more, or it has been given another name.",
	},

	detail: {
		sheet: "Book details",
		notFoundTitle: "This book could not be found",
		notFound: "It may have been removed from the shelf.",
		previousBook: "Previous book",
		nextBook: "Next book",
		noPrevious: "There is no previous book",
		noNext: "There is no next book",
		read: "Read",
		continue: "Carry on reading",
		edit: "Edit",
		percentRead: "How much has been read",
		bookmark: "Bookmark",
		lastRead: "Last read {{date}}",
		neverOpened: "Not opened yet",
	},

	history: {
		clear: "Clear reading history",
		clearTitle: "Clear the reading history of “{{title}}”?",
		clearDescription:
			"The reading position and the date last opened are deleted, and the book is unread again. The rating, note, tags and collections are kept. The position cannot be recovered.",
		clearConfirm: "Clear",
		positionSaved: "Position saved",
		added: "Added to the shelf",
		note: "The reading position is written when a book is closed and when the app quits.",
	},

	record: {
		description: "Description",
		noDescription: "There is no description.",
		note: "Note",
		noNote: "There is no note. One can be written from Edit.",
		reading: "Reading",
		bibliography: "Bibliography",
		language: "Language",
		identifier: "Identifier",
		noCollections: "Not in any collection.",
		noTags: "No tags.",
		pageCount_one: "{{count}} page",
		pageCount_other: "{{count}} pages",
		sectionCount_one: "{{count}} section",
		sectionCount_other: "{{count}} sections",
		scanned: "Scanned",
		pathNote:
			"A path relative to the shelf's folder. The book's own file is never deleted.",
		seriesOf: "Series · {{series}}",
		volume: "Volume {{index}}",
		currentVolume: "This book · {{percent}}%",
		remove: "Remove from the shelf",
		removeTitle: "Remove {{title}} from the shelf?",
	},

	edit: {
		title: "Edit this book",
		description:
			"Edit what the scan read and what you added afterwards. The book's own file is never changed.",
		subtitle: "Subtitle",
		publishedRaw: "As the file has it: {{value}}",
		pickDate: "Pick from a calendar",
		datePlaceholder: "e.g. 2024-03-15",
		tagsNote:
			"A collection groups books; a tag is something you can say about a book. Add as many as you like.",
		notePlaceholder: "For yourself, next time",
		rescanTitle: "Read this book from its file again?",
	},

	reader: {
		back: "Back",
		display: "Display",
		ask: "Ask",
		displaySettings: "Display settings",
		fullscreen: "Full screen (F11)",
		toc: "Contents",
		search: "Search",
		closePanel: "Close the panel (Esc)",
		noTocTitle: "No contents",
		noToc: "This book carries no table of contents.",
		untitled: "(untitled)",
		position: "Reading position",
		searchText: "Search the text",
		clearSearch: "Clear the search",
		searching: "Searching… {{percent}}%",
		matches_one: "{{count}} match",
		matches_other: "{{count}} matches",
		matchesAtLeast_one: "{{count}} match or more",
		matchesAtLeast_other: "{{count}} matches or more",
		pressEnter: "Press Enter to search",
		noMatchesTitle: "Nothing found",
		noMatches:
			"Pages that are only images — a CBZ, a scanned PDF — carry no text, so there is nothing to search.",
		notOnShelf: "That book is not on the shelf.",
		readFailed: "Could not read the file: {{message}}",
		openBookFailed: "Could not open the book: {{message}}",
		stillLoading:
			"This is taking a while. It is still working; if nothing happens, try opening the book again.",
		unsupportedFile:
			"{{file}} is not a supported format. Open an EPUB, PDF, CBZ or ZIP.",
		openFailed: "Could not open {{file}}: {{message}}",
		fileGone:
			"This file can no longer be opened. Drop it again, or choose it with Ctrl+O.",
		fetchFailed: "Could not fetch the book from the server ({{status}}).",
	},

	display: {
		close: "Close the display settings (Esc)",
		theme: "Colours",
		appearance: "Look",
		fontSize: "Font size",
		lineHeight: "Line height",
		letterSpacing: "Letter spacing",
		font: "Font",
		justify: "Justify",
		hyphenate: "Hyphenate Latin text",
		strictLineBreak: "Strict line breaking",
		page: "Page",
		details: "Details",
		flow: "Movement",
		reverseDirection: "Reverse the page direction",
		paginated: "Pages",
		scrolled: "Scroll",
		columns: "Columns",
		oneColumn: "One",
		twoColumns: "Two",
		margins: "Margins",
		narrow: "Narrow",
		normal: "Normal",
		wide: "Wide",
		marginNote:
			"Margins act on the text only. An illustration keeps its own size as long as it fits the page.",
		zoom: "Zoom",
		fitPage: "Whole page",
		fitWidth: "Fit the width",
		spread: "Two-page spread",
		invertFixed: "Invert pages in the dark theme",
		fixedNote:
			"A PDF or CBZ fixes the look of its pages inside the book, so size, font and margins have nothing to act on. Inverting suits neither photographs nor colour comics.",
		reset: "Back to the defaults",
	},

	settings: {
		title: "Settings",
		open: "Open the settings",
		shelfFolder: "Shelf folder",
		folder: "Folder",
		noFolder: "None chosen yet",
		leaveFolder: "Back to the first screen",
		language: "Language",
	},

	session: {
		heading: "Sign-in",
		signInPrompt: "Enter the password set on the server.",
		password: "Password",
		wrongPassword: "Wrong password.",
		signIn: "Sign in",
		signOut: "Sign out",
		signedInNote: "This browser signed in with the password to read the shelf.",
	},
} as const satisfies Catalogue<typeof ja>;
