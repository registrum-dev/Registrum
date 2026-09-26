# foliate-js に当てている変更

取り込み元のコミットは `FOLIATE_JS_COMMIT.txt`。**upgrade したら以下を当て直すこと。**
どの変更もコメントに `PATCH (registrum)` を入れてあるので `grep` で見つかる。

```
grep -rn "PATCH (registrum)" public/foliate-js/
```

1〜3 はどれも、EPUB の spine に **SVG コンテンツ文書**が入っている本で必要になる。
EPUB 3 では SVG も正当なコンテンツ文書で、日本のライトノベルは表紙と口絵を
これで持っていることが多い。SVG 文書には `<body>` も `<head>` も無い。4 だけは
別件で、スマホのなぞり（[docs/reader-chrome.md](../../docs/reader-chrome.md)）の話。

---

## 1. `paginator.js` — `doc.body` が無い文書で落ちる

可変レイアウト用のレンダラは、全編にわたって `doc.body` がある前提で書かれている。
SVG 文書では `getComputedStyle(doc.body)` が `TypeError` を投げる。

まずいのは投げる場所で、iframe の `load` ハンドラの中、`resolve()` に到達する前。
**セクション読み込みの Promise が永久に解決されず、リーダーが「読み込み中」から
戻ってこなくなる。**例外は握り潰されるので、画面には何も出ない。

対処: ヘルパーを 1 つ足して、`body` が無ければ根要素を使う。

```js
const contentRoot = doc => doc.body ?? doc.documentElement
```

置き換えた箇所（通常の HTML 文書では `doc.body` が必ずあるので挙動は変わらない）:

| 元 | 後 |
|---|---|
| `doc.createTreeWalker(doc.body, …)` | `contentRoot(doc)` |
| `nodes[0] ?? doc.body` | `contentRoot(doc)` |
| `getComputedStyle(doc.body)`（`getDirection`） | `contentRoot(doc)` |
| `doc.body.dir === 'rtl'` | `contentRoot(doc).dir` |
| `getComputedStyle(doc.body)`（`getBackground`） | `contentRoot(doc)` |
| `selectNodeContents(doc.body)` | `contentRoot(doc)` |
| `observer.observe(doc.body)` | `contentRoot(doc)` |
| `setStylesImportant(doc.body, …)` ×2 | `contentRoot(doc)` |
| `doc.body.querySelectorAll('img, svg, video')` | `doc.querySelectorAll(…)` |
| `observer.unobserve(this.document.body)` | `contentRoot(this.document)` |

最後の 2 つだけ少し意味が変わる。`doc.querySelectorAll` にしたのは、SVG 文書では
根要素そのものが対象になってほしいため。

## 2. `paginator.js` — ページ余白の分だけ画像が二重に縮む

`setImageSize()` は `img` / `svg` / `video` の上限を `${height - margin * 2}px`
（縦書きでは幅）にしていた。

しかしこの `width` / `height` は `#container` の実測値で、`#container` は上下の行が
**まさに余白そのもの**であるグリッドの中央セルである。つまり余白は既に引かれている。
そこからもう一度引いていたため、**ページ余白を広げると本の中の画像がすべて小さく
なる**という挙動になっていた。

対処: `- margin * 2` を外し、上限をページそのものにした。画像は収まらないときだけ
縮み、それ以外は自分のサイズのまま表示される。

## 3. `epubcfi.js` — 根要素に張り付いた range で落ちる

絵だけのページにはテキストノードが無いので、可視範囲の range が文書要素そのものに
張り付く。`nodeToParts` はそこから親をたどり続け、`Document` を 1 段越えて `null` に
到達し、`getChildNodes(null)` で落ちる。

これは `#onRelocate` の中で起きるため、**そのページでは `relocate` が発火せず、
ページ番号も進捗バーも止まったままになる。**

対処: たどる親が無くなったら空を返す。

```js
if (!parentNode) return []
```

## 4. `paginator.js` — 縦組みの本が上下のなぞりでめくれる

上流は `touchmove` でなぞった指にページを追従させる。動く向きは**段組みが並ぶ向き**
（`scrollProp`）なので、**縦組みの本では上下のなぞりがページ送りになる。**紙の本は
縦組みでも左右へめくるし、上下になぞるのは本文を追う動きであって「次へ」ではない。
横組みの本ではこの追従が左右に効くが、そちらだけ残すと、同じ横のなぞりが書字方向に
よって効いたり効かなかったりする。

対処: **書字方向によらず上流の追従を使わない。**`#onTouchMove` から指について動かす
処理を、`#onTouchEnd` から離したところで最寄りのページへ吸い付かせる処理を落とした。
送りはアプリ側（`src/features/reader/components/reader-view.tsx`）が受け持ち、横へ
48px 以上なぞって指を離したところで 1 ページ送る。端のタップも同じ送りに流れる。

**`#onTouchMove` の `e.preventDefault()` は残す。**上流がここで既定の動作を止めて
いるのは、なぞりを自分で受け持つため。呼ばずに抜けると既定の動作がブラウザに残り、
ページは送られないまま本文が指について動く。

---

## 当てていない変更

SVG ページの**レイアウト**は foliate-js 側では直していない。素の paginator に SVG 文書を
渡すと、段組の計算が噛み合わず絵が page からはみ出して上下が切れる。これは
`src/features/reader/svg-sections.ts` で、SVG を HTML でくるんでから渡すことで回避して
いる（CBZ のページと同じ形にする）。1 と 2 のパッチは、くるみ損ねた場合に落ちないための
保険として残してある。

---

## 取り込んでいないファイル

上流は `vendor/pdfjs/` に pdf.js 一式（`pdf.mjs`、`pdf.worker.mjs`、`cmaps/`、
`standard_fonts/`）をコミットしているが、ここには置いていない。どれも素の
`pdfjs-dist` と同じものなので、`apps/web` の依存に入れた `pdfjs-dist` から
`vite-plugin-pdfjs.ts` が同じ URL で配る（dev では node_modules から返し、ビルドでは
`dist/` へコピーする）。**upgrade で上流を丸ごとコピーしたら、この 4 つは消すこと。**
バージョンは上流の `pdf.mjs` 冒頭の `pdfjsVersion` に合わせて固定する（今は 5.5.207）。

`text_layer_builder.css` と `annotation_layer_builder.css` は `pdfjs-dist` に単体で
入っていないので、上流のものをそのまま置いている。
