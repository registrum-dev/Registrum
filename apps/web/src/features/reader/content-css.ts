// The stylesheet injected into the book's own document.

import type { Settings } from "@/features/reader/settings";
import { PALETTES } from "./themes";

const TEXT_BLOCKS =
	"p, li, blockquote, dd, dt, td, th, div, h1, h2, h3, h4, h5, h6";
const PARAGRAPHS = "p, li, blockquote, dd";

/** The stylesheet injected into the book's own document. */
export function buildContentCss(settings: Settings): [string, string] {
	const palette = PALETTES[settings.theme];

	const before = `
    html {
      color-scheme: ${palette.scheme};
    }
  `;

	const after = `
    html {
      font-size: ${settings.fontSize}px !important;
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }

    html, body {
      color: ${palette.fg} !important;
      background: ${palette.bg} !important;
    }

    ${
			settings.fontFamily
				? `html, body, ${TEXT_BLOCKS} { font-family: ${settings.fontFamily} !important; }`
				: ""
		}

    a:any-link {
      color: ${palette.link};
    }

    ${TEXT_BLOCKS} {
      line-height: ${settings.lineHeight} !important;
      ${
				settings.letterSpacing
					? `letter-spacing: ${settings.letterSpacing}em !important;`
					: ""
			}
    }

    ${PARAGRAPHS} {
      text-align: ${settings.justify ? "justify" : "start"};
      -webkit-hyphens: ${settings.hyphenate ? "auto" : "manual"};
      hyphens: ${settings.hyphenate ? "auto" : "manual"};
      -webkit-hyphenate-limit-before: 3;
      -webkit-hyphenate-limit-after: 2;
      -webkit-hyphenate-limit-lines: 2;
      line-break: ${settings.strictLineBreak ? "strict" : "auto"};
      orphans: 2;
      widows: 2;
    }
  `;

	return [squash(before), squash(after)];
}

/** Collapses the template-literal indentation so the injected <style> stays readable. */
function squash(css: string): string {
	return css
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.join("\n");
}
