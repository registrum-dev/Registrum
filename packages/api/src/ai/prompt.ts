// What is said to the model. These are not screen text, so they live here
// rather than in the screen's catalogue.

import type { Character } from "../library/character";
import type { BookRecord } from "../library/record";
import type { BookText } from "../parse/text";
import { joined, labelsOf, type Picked } from "./chapters";

/** The language a generation is asked in. */
export const LOCALES = ["ja", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** One message before the last one. The question itself is `Prompt.user`. */
export interface Said {
	kind: "asked" | "answered";
	text: string;
}

export interface Prompt {
	system: string;
	/** What was said before this message, in order. Empty for the three
	 *  generations: each is one question, asked once. */
	history: Said[];
	user: string;
}

export const SPEAKERS = ["reader", "model"] as const;
/** Who said one of the messages the screen hands back. */
export type Speaker = (typeof SPEAKERS)[number];

/** One message already on screen. */
export interface Turn {
	speaker: Speaker;
	text: string;
}

const SYNOPSIS_JA = `あなたは本のあらすじを書くアシスタントです。
- 以下はこの本の全文です。この本文に含まれる内容だけを根拠に書いてください。
- 本文に書かれていないことを補わないでください。
- **結末と、物語の後半で明かされることには触れないでください。**
  これは本を読む前の人が読むあらすじです。何が起きるかを先に知らせないでください。
- 書くのは、始まりの状況・主要な人物・物語が動き出すきっかけまでです。
- 章ごとに区切らず、ひと続きの文章にしてください。
- 300 字前後の日本語の地の文で書いてください。見出し・箇条書き・前置き・結びの感想は付けないでください。`;

const SYNOPSIS_EN = `You are an assistant that writes synopses of books.
- Below is the full text of the book. Write only from what this text contains.
- Do not add anything the text does not say.
- **Do not touch the ending, or anything revealed in the later half of the story.**
  This synopsis is read by people who have not read the book. Do not tell them what happens.
- Write up to the opening situation, the main characters, and what sets the story in motion.
- Write one continuous passage, not a chapter-by-chapter breakdown.
- Write about 150 words of English prose. Add no headings, bullet lists, preamble or closing impressions.`;

const CHARACTERS_JA = `あなたは小説の登場人物の記録を書くアシスタントです。
- 以下はこの本の全文です。この本文に含まれる内容だけを根拠にしてください。
- 本文に書かれていないことを補わないでください。
- 結末やこの巻で起きたことも、事実として書いてください。読む前の人向けのあらすじではありません。
- 人物は本文での重要度が高い順に、多くても 24 人までにしてください。
- name は本文でその人物を指すのに最もよく使われる表記にしてください。
- aliases には、同じ人物を指す別の表記（姓・名・あだ名・役職）を入れてください。
- overview はその人物が何者か、personality は性格、appearance は外見、speech は口調、affiliation は所属です。
- events には、この巻でその人物に起きたことだけを入れてください。多くても 12 件までにしてください。
- role は、話の中心にいる人物が main、繰り返し出てくる人物が supporting、それ以外が minor です。
- 人物同士の関係は書かないでください。`;

const CHARACTERS_EN = `You are an assistant that writes up the characters of a novel.
- Below is the full text of the book. Use only what this text contains.
- Do not add anything the text does not say.
- State the ending and what happens in this volume as fact. This is not a spoiler-free synopsis.
- List the characters in order of importance in the text, at most 24.
- Use for name the spelling the text most often uses for that character.
- Put other spellings of the same character (surname, given name, nickname, title) in aliases.
- overview is who they are, personality their character, appearance how they look, speech how they talk, affiliation where they belong.
- Put in events only what happens to that character in this volume, at most 12 entries.
- role is main for characters at the centre of the story, supporting for recurring ones, minor otherwise.
- Do not describe the relationships between characters.`;

const RELATIONS_JA = `あなたは小説の登場人物の関係を図にするアシスタントです。
- 以下はこの本の全文と、すでに決まった登場人物の一覧です。
- 関係は一覧に載っている人物の間だけにしてください。人物を足さないでください。
- 本文に書かれていない関係を補わないでください。
- **結末と、物語の後半で明かされる関係には触れないでください。**
  正体・血縁・裏切りなど、読み進めて分かることを関係の名前にしないでください。
- 関係の名前は「恋人」「妹」「上司」のように 10 字以内の短い語にしてください。
- from と to は、一覧の name をそのまま使ってください。
- mutual は、関係が双方向のとき（恋人・兄妹・同僚）に true、片方向のとき（〜を慕う）に false です。`;

const RELATIONS_EN = `You are an assistant that maps the relationships between the characters of a novel.
- Below is the full text of the book and the character list already decided.
- Draw relationships only between characters on that list. Do not add characters.
- Do not add relationships the text does not state.
- **Do not touch the ending, or relationships revealed in the later half of the story.**
  Do not name a relationship after something only reading on reveals, such as a true identity, a blood tie or a betrayal.
- Name each relationship with a short phrase of a few words, such as "lover", "sister" or "boss".
- Use the name from the list verbatim for from and to.
- mutual is true when the relationship goes both ways (lovers, siblings, colleagues) and false when it goes one way (looks up to).`;

const ASK_JA = `あなたは本を読んでいる読み手を助けるアシスタントです。
- 以下は読み手が自分で選んだ章です。この本文に含まれる内容だけを根拠に答えてください。
- 読み手はこの範囲を読むと決めているので、結末に触れることを気にせず答えてください。
- 選ばれていない章の内容を推測しないでください。本文に答えが無いときは、無いと答えてください。
- 引用は短くし、どの章のものかを添えてください。
- 見出し・箇条書き・強調の記号を使わず、ふつうの文章で答えてください。
- 日本語で答えてください。`;

const ASK_EN = `You are an assistant helping a reader who is part-way through a book.
- Below are the chapters the reader picked. Answer only from what this text contains.
- The reader has chosen to read this range, so answer without worrying about spoilers.
- Do not guess at chapters that were not picked. If the text has no answer, say so.
- Keep quotations short and name the chapter they come from.
- Use no headings, bullet lists or emphasis marks. Answer in ordinary prose.
- Answer in English.`;

const RULE_JA = `あなたは本のファイルのパスから書誌を読み取る正規表現を書くアシスタントです。
- パスは本棚のフォルダからの相対パスで、区切りは / です。先頭に / は付きません。
- パターンはパスの途中に当たれば十分です。パス全体に当てたいときだけ ^ と $ を書いてください。
- JavaScript の正規表現（RegExp、u フラグ付き）の構文で書いてください。
- 値を取るグループには (?<name>...) で名前を付けてください。名前は英小文字にしてください。
- テンプレートの {name} は、その名前のグループが取った文字列に置き換わります。
  グループ名でない文字はそのまま書き込まれるので、分類のように決まった値はテンプレートに直接書けます。
- 例に挙げた本では、各項目が例のとおりの値にならなければいけません。
- ほかのパスも、同じ規則で名付けられた本ならなるべく当たるように、例だけに合う書き方を避けてください。
  固有の題名や作者名をパターンに書き込まないでください。
- 著者・タグ・コレクションは 、 か , で区切ると複数の値になります。・ は区切りになりません。
- 巻は数として読みます。先頭の 0 と全角数字は読めます。
- 分類は novel・manga・doujinshi・academic・practical・other のどれかです。`;

const RULE_EN = `You are an assistant that writes regular expressions reading a book's details out of its file path.
- The path is relative to the library folder and separated by /. It never starts with /.
- A pattern only has to match somewhere in the path. Write ^ and $ only when the whole path has to match.
- Write in the syntax of JavaScript regular expressions (RegExp, with the u flag).
- Name each group whose value is used with (?<name>...), in lower-case ASCII.
- In a template, {name} is replaced by what the group of that name caught.
  Anything else is written as it is, so a fixed value such as a category can be written into the template directly.
- For each example book, every field must come out exactly as the example gives it.
- The other paths should match too where the books are named the same way. Do not write a pattern that only fits the examples,
  and do not write particular titles or author names into it.
- Authors, tags and collections become several values when separated by , or 、. The character ・ does not separate.
- The volume is read as a number. Leading zeros and full-width digits are fine.
- The category is one of novel, manga, doujinshi, academic, practical or other.`;

const TASKS = {
	rule: {
		ja: "例の本で各項目がこの値になる正規表現と、項目ごとのテンプレートを出してください。",
		en: "Give a regular expression and a template for each field that produce these values for the example books.",
	},
	retryRule: {
		ja: "その答えをこちらで試したところ、次のとおり合いませんでした。直した答えを出してください。",
		en: "That answer was tried here and did not fit, as follows. Give a corrected answer.",
	},
	synopsis: {
		ja: "この本のあらすじを書いてください。",
		en: "Write a synopsis of this book.",
	},
	characters: {
		ja: "この本の登場人物の説明と、この巻で起きた出来事を出してください。",
		en: "Give the characters of this book and what happens to them in this volume.",
	},
	relations: {
		ja: "この本の登場人物の間の関係を出してください。",
		en: "Give the relationships between the characters of this book.",
	},
} as const;

function pick(locale: Locale, ja: string, en: string): string {
	return locale === "ja" ? ja : en;
}

export function synopsisPrompt(
	book: BookRecord,
	text: BookText,
	locale: Locale,
): Prompt {
	return {
		system: pick(locale, SYNOPSIS_JA, SYNOPSIS_EN),
		history: [],
		user: userMessage(book, text, null, TASKS.synopsis[locale]),
	};
}

export function charactersPrompt(
	book: BookRecord,
	text: BookText,
	locale: Locale,
): Prompt {
	return {
		system: pick(locale, CHARACTERS_JA, CHARACTERS_EN),
		history: [],
		user: userMessage(book, text, null, TASKS.characters[locale]),
	};
}

export function relationsPrompt(
	book: BookRecord,
	text: BookText,
	characters: readonly Character[],
	locale: Locale,
): Prompt {
	return {
		system: pick(locale, RELATIONS_JA, RELATIONS_EN),
		history: [],
		user: userMessage(
			book,
			text,
			charactersBlock(characters),
			TASKS.relations[locale],
		),
	};
}

/** One question about the chapters the reader picked. What went before it is
 *  carried by the screen, because nothing here is written down. */
export function askPrompt(
	book: BookRecord,
	picked: Picked,
	history: readonly Turn[],
	question: string,
	locale: Locale,
): Prompt {
	// The book and its chapters lead, and the question comes last, so what the
	// reader types is the only part of the call that is new each time.
	const said: Said[] = [
		{ kind: "asked", text: `${bookTag(book)}\n${pickedBlock(picked)}` },
	];
	for (const turn of history) {
		said.push({
			kind: turn.speaker === "reader" ? "asked" : "answered",
			text: turn.text,
		});
	}
	return {
		system: pick(locale, ASK_JA, ASK_EN),
		history: said,
		user: `<question>${escapeXml(question)}</question>`,
	};
}

/** One book the reader held up, with the values it should give. The field's
 *  name is the word the answer has to use. */
export interface RuleExample {
	path: string;
	values: [field: string, value: string][];
}

/** The first request for a path rule: the examples, other paths from the same
 *  books, and the job. */
export function rulePrompt(
	examples: readonly RuleExample[],
	others: readonly string[],
	locale: Locale,
): Prompt {
	const shown = examples.map((example) => {
		const values = example.values
			.map(
				([field, value]) =>
					`    <value field="${field}">${escapeXml(value)}</value>`,
			)
			.join("\n");
		return `  <example path="${escapeXml(example.path)}">\n${values}\n  </example>`;
	});
	const paths = others.map((path) => `  <path>${escapeXml(path)}</path>`);
	return {
		system: pick(locale, RULE_JA, RULE_EN),
		history: [],
		user: `<examples>\n${shown.join("\n")}\n</examples>\n<other-paths>\n${paths.join("\n")}\n</other-paths>\n<task>${escapeXml(TASKS.rule[locale])}</task>`,
	};
}

/** One way an answer failed an example, as the model is told it. */
export type RuleMiss =
	| { kind: "unreadable"; error: string }
	| { kind: "noTemplate"; field: string }
	| { kind: "missed"; path: string }
	| {
			kind: "wrong";
			path: string;
			field: string;
			want: string;
			got: string | null;
	  };

function missSaid(miss: RuleMiss, locale: Locale): string {
	const ja = locale === "ja";
	switch (miss.kind) {
		case "unreadable":
			return ja
				? `パターンが JavaScript の正規表現として読めません: ${miss.error}`
				: `The pattern does not compile as a JavaScript regular expression: ${miss.error}`;
		case "noTemplate":
			return ja
				? `${miss.field} のテンプレートがありません。`
				: `There is no template for ${miss.field}.`;
		case "missed":
			return ja
				? `パターンが ${miss.path} に当たりません。`
				: `The pattern does not match ${miss.path}.`;
		case "wrong":
			if (miss.got === null) {
				return ja
					? `${miss.path} の ${miss.field} は「${miss.want}」になるはずが、何も取れませんでした。`
					: `${miss.field} of ${miss.path} should be "${miss.want}" but came out empty.`;
			}
			return ja
				? `${miss.path} の ${miss.field} は「${miss.want}」になるはずが、「${miss.got}」になりました。`
				: `${miss.field} of ${miss.path} should be "${miss.want}" but came out as "${miss.got}".`;
	}
}

/** The same request again, after an answer that did not fit: what it said, and
 *  why it did not. */
export function ruleAgain(
	asked: Prompt,
	answered: string,
	misses: readonly RuleMiss[],
	locale: Locale,
): Prompt {
	const problems = misses.map(
		(miss) => `  <problem>${escapeXml(missSaid(miss, locale))}</problem>`,
	);
	return {
		system: asked.system,
		history: [
			...asked.history,
			{ kind: "asked", text: asked.user },
			{ kind: "answered", text: answered },
		],
		user: `<problems>\n${problems.join("\n")}\n</problems>\n<task>${escapeXml(TASKS.retryRule[locale])}</task>`,
	};
}

/** The chapters that were picked. A different tag from `<book-text>`: this is a
 *  part of the book the reader chose, not the book. */
function pickedBlock(picked: Picked): string {
	return `<selected-chapters chapters="${escapeXml(picked.labels.join(", "))}" sections="${picked.sections.length}/${picked.sectionTotal}" chars="${picked.chars}">\n${picked.text}\n</selected-chapters>`;
}

/** The one message every generation sends: what the book is, the book, and the
 *  job. */
function userMessage(
	book: BookRecord,
	text: BookText,
	extra: string | null,
	task: string,
): string {
	const parts = [bookTag(book), textBlock(text)];
	if (extra) parts.push(extra);
	parts.push(`<task>${escapeXml(task)}</task>`);
	return parts.join("\n");
}

function bookTag(book: BookRecord): string {
	return `<book title="${escapeXml(book.title)}" authors="${escapeXml(book.authors.join(", "))}" publisher="${escapeXml(book.publisher ?? "")}" />`;
}

/** The whole book, each section headed by the chapter it belongs to. */
function textBlock(text: BookText): string {
	return `<book-text chapters="${escapeXml(labelsOf(text.sections).join(", "))}" sections="${text.sections.length}/${text.sectionTotal}" chars="${text.chars}">\n${joined(text.sections)}\n</book-text>`;
}

/** The people the map has to stay inside. Only what names a person and says who
 *  they are: personality, looks and events would not change a relationship. */
function charactersBlock(characters: readonly Character[]): string {
	const lines = characters.map(
		(person) =>
			`  <character name="${escapeXml(person.name)}" aliases="${escapeXml(person.aliases.join(", "))}" role="${person.role}" overview="${escapeXml(person.overview)}" />`,
	);
	return `<characters>\n${lines.join("\n")}\n</characters>`;
}

/** Enough for a value that sits inside a tag: a title holding a quote must not
 *  close the attribute it is in and turn the rest of the line into markup. */
function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll('"', "&quot;");
}
