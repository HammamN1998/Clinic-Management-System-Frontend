import { Content } from 'pdfmake/interfaces';

/**
 * pdfmake RTL runs often render Arabic **word order** backwards. Reversing whitespace-separated
 * tokens is the usual workaround (Arabic-only cells; avoid mixed Arabic/Latin in one string).
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

/**
 * Build a pdfmake content fragment: Arabic-only cells use embedded Arabic font + rtl;
 * other cells inherit default (Roboto). Do not use for mixed Arabic+Latin in one string.
 */
export function pdfTextCell(text: string, baseStyle?: string): Content {
  const t = text ?? '';
  if (containsArabic(t)) {
    const displayText = fixArabicWordOrderForPdfmake(t);
    return {
      text: displayText,
      font: 'Arabic',
      rtl: true,
      alignment: 'right',
      ...(baseStyle ? { style: baseStyle } : {}),
    } as Content;
  }
  if (baseStyle) {
    return { text: t, style: baseStyle };
  }
  return t;
}
