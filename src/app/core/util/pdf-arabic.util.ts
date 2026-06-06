import { Content } from 'pdfmake/interfaces';

/**
 * pdfmake RTL runs often render Arabic **word order** backwards. Reversing whitespace-separated
 * tokens is the usual workaround. pdfmake also has no per-glyph font fallback, so a string that
 * mixes Arabic and Latin must be split into per-script runs (Arabic font vs. Roboto); otherwise
 * the script not covered by the active font renders as tofu rectangles.
 * If letter joining is wrong, add a reshaping step before this.
 */

/** Arabic and Arabic presentation blocks used for script detection (no mixed-cell assumption). */
const ARABIC_SCRIPT_RE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/**
 * Compensate for pdfmake laying out RTL text in LTR word order.
 */
export function fixArabicWordOrderForPdfmake(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return text;
  }
  return trimmed.split(/\s+/).reverse().join('  ');
}

export function containsArabic(text: string): boolean {
  if (!text?.trim()) {
    return false;
  }
  return ARABIC_SCRIPT_RE.test(text);
}

const LATIN_LETTER_RE = /[A-Za-z]/;

export function containsLatin(text: string): boolean {
  if (!text?.trim()) {
    return false;
  }
  return LATIN_LETTER_RE.test(text);
}

interface ScriptSegment {
  text: string;
  arabic: boolean;
}

/**
 * Split a mixed string into maximal Arabic vs. Latin runs. Neutral characters
 * (spaces, digits, punctuation) attach to the current run so we don't create
 * tiny fragments. Used to assign a per-run font (pdfmake has no glyph fallback).
 */
function segmentByScript(text: string): ScriptSegment[] {
  const segments: ScriptSegment[] = [];
  let buffer = '';
  let mode: 'ar' | 'lat' | null = null;

  const flush = () => {
    if (buffer) {
      segments.push({ text: buffer, arabic: mode === 'ar' });
      buffer = '';
    }
  };

  for (const ch of text) {
    let chMode: 'ar' | 'lat' | null;
    if (ARABIC_SCRIPT_RE.test(ch)) {
      chMode = 'ar';
    } else if (LATIN_LETTER_RE.test(ch)) {
      chMode = 'lat';
    } else {
      chMode = null; // neutral: keep with the current run
    }

    if (chMode === null || mode === null) {
      buffer += ch;
      if (mode === null && chMode !== null) {
        mode = chMode;
      }
      continue;
    }
    if (chMode === mode) {
      buffer += ch;
      continue;
    }
    flush();
    mode = chMode;
    buffer += ch;
  }
  flush();
  return segments;
}

/**
 * Build an inline pdfmake run array for a mixed Arabic+Latin string: Arabic runs
 * use the embedded Arabic font (+ rtl + word-order fix), Latin runs use the
 * default Roboto font so English does not render as tofu rectangles.
 */
function buildMixedRuns(text: string): Content {
  return segmentByScript(text).map((seg) =>
    seg.arabic
      ? {
          text: fixArabicWordOrderForPdfmake(seg.text),
          font: 'Arabic',
          rtl: true,
        }
      : { text: seg.text, font: 'Roboto' },
  ) as unknown as Content;
}

/**
 * Build a pdfmake content fragment: Arabic-only cells use embedded Arabic font + rtl;
 * other cells inherit default (Roboto). Do not use for mixed Arabic+Latin in one string.
 */
export function pdfTextCell(text: string, baseStyle?: string): Content {
  const t = text ?? '';
  if (!containsArabic(t)) {
    if (baseStyle) {
      return { text: t, style: baseStyle };
    }
    return t;
  }
  const styleProp = baseStyle ? { style: baseStyle } : {};
  if (containsLatin(t)) {
    return {
      text: buildMixedRuns(t),
      alignment: 'right',
      ...styleProp,
    } as unknown as Content;
  }
  return {
    text: fixArabicWordOrderForPdfmake(t),
    font: 'Arabic',
    rtl: true,
    alignment: 'right',
    ...styleProp,
  } as unknown as Content;
}

/**
 * Build a text node that switches to the embedded Arabic font (+ rtl + word-order fix)
 * when the text contains Arabic, otherwise renders with the default font. Extra pdfmake
 * text options (style, alignment, margin, fillColor, ...) can be merged in via `opts`.
 * Use for static/translated labels so Arabic glyphs render instead of tofu rectangles.
 * Keep label text Arabic-only (do not concatenate Latin values into the same string).
 */
export function pdfLabel(
  text: string,
  opts: Record<string, unknown> = {},
): Content {
  const t = text ?? '';
  if (!containsArabic(t)) {
    return { text: t, ...opts } as Content;
  }
  if (containsLatin(t)) {
    return {
      text: buildMixedRuns(t),
      alignment: 'right',
      ...opts,
    } as unknown as Content;
  }
  return {
    text: fixArabicWordOrderForPdfmake(t),
    font: 'Arabic',
    rtl: true,
    alignment: 'right',
    ...opts,
  } as unknown as Content;
}
