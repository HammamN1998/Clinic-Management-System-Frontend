import { APP_LANG_AR } from './app-locale.util';

/**
 * Most-used world currencies, offered to doctors as their clinic currency.
 * ISO 4217 codes only; symbols, names and decimal rules come from `Intl`.
 */
export const SUPPORTED_CURRENCY_CODES: readonly string[] = [
  'AED',
  'ARS',
  'AUD',
  'BDT',
  'BHD',
  'BRL',
  'CAD',
  'CHF',
  'CLP',
  'CNY',
  'COP',
  'CZK',
  'DKK',
  'DZD',
  'EGP',
  'EUR',
  'GBP',
  'HKD',
  'HUF',
  'IDR',
  'ILS',
  'INR',
  'IQD',
  'JOD',
  'JPY',
  'KES',
  'KRW',
  'KWD',
  'LBP',
  'LYD',
  'MAD',
  'MXN',
  'MYR',
  'NGN',
  'NOK',
  'NZD',
  'OMR',
  'PEN',
  'PHP',
  'PKR',
  'PLN',
  'QAR',
  'RON',
  'RUB',
  'SAR',
  'SEK',
  'SGD',
  'THB',
  'TND',
  'TRY',
  'TWD',
  'UAH',
  'USD',
  'VND',
  'YER',
  'ZAR',
];

export const DEFAULT_CURRENCY_CODE = 'USD';

/** Region codes mapped to a currency, used to guess a sensible first-time default. */
const REGION_CURRENCY: Readonly<Record<string, string>> = {
  AE: 'AED', AR: 'ARS', AT: 'EUR', AU: 'AUD', BD: 'BDT', BE: 'EUR', BH: 'BHD',
  BR: 'BRL', CA: 'CAD', CH: 'CHF', CL: 'CLP', CN: 'CNY', CO: 'COP', CY: 'EUR',
  CZ: 'CZK', DE: 'EUR', DK: 'DKK', DZ: 'DZD', EE: 'EUR', EG: 'EGP', ES: 'EUR',
  FI: 'EUR', FR: 'EUR', GB: 'GBP', GR: 'EUR', HK: 'HKD', HU: 'HUF', ID: 'IDR',
  IE: 'EUR', IL: 'ILS', IN: 'INR', IQ: 'IQD', IT: 'EUR', JO: 'JOD', JP: 'JPY',
  KE: 'KES', KR: 'KRW', KW: 'KWD', LB: 'LBP', LT: 'EUR', LU: 'EUR', LV: 'EUR',
  LY: 'LYD', MA: 'MAD', MT: 'EUR', MX: 'MXN', MY: 'MYR', NG: 'NGN', NL: 'EUR',
  NO: 'NOK', NZ: 'NZD', OM: 'OMR', PE: 'PEN', PH: 'PHP', PK: 'PKR', PL: 'PLN',
  PS: 'ILS', PT: 'EUR', QA: 'QAR', RO: 'RON', RU: 'RUB', SA: 'SAR', SE: 'SEK',
  SG: 'SGD', SI: 'EUR', SK: 'EUR', TH: 'THB', TN: 'TND', TR: 'TRY', TW: 'TWD',
  UA: 'UAH', US: 'USD', VN: 'VND', YE: 'YER', ZA: 'ZAR',
};

export type CurrencyDisplay = 'symbol' | 'code';

export interface CurrencyOption {
  code: string;
  /** Localized currency name, e.g. "Euro". */
  name: string;
  /** Short symbol, e.g. "€". Falls back to the code when none exists. */
  symbol: string;
}

export function isSupportedCurrency(code: unknown): code is string {
  return typeof code === 'string' && SUPPORTED_CURRENCY_CODES.includes(code);
}

/**
 * BCP 47 locale used for money formatting. Arabic keeps Latin digits so amounts
 * stay consistent with the number inputs doctors type them into.
 */
export function getCurrencyLocale(lang: string): string {
  return lang === APP_LANG_AR ? 'ar-u-nu-latn' : 'en';
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(
  locale: string,
  currency: string,
  display: CurrencyDisplay,
  fractionDigits: number,
): Intl.NumberFormat {
  const key = `${locale}|${currency}|${display}|${fractionDigits}`;
  const cached = formatterCache.get(key);
  if (cached) {
    return cached;
  }
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    currencyDisplay: display === 'code' ? 'code' : 'narrowSymbol',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  };
  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(locale, options);
  } catch {
    // `narrowSymbol` is unsupported on older engines, and unknown codes throw.
    formatter = new Intl.NumberFormat(locale, {
      ...options,
      currencyDisplay: display === 'code' ? 'code' : 'symbol',
      currency: isSupportedCurrency(currency) ? currency : DEFAULT_CURRENCY_CODE,
    });
  }
  formatterCache.set(key, formatter);
  return formatter;
}

/**
 * Whole amounts print without decimals (the common case for clinic pricing);
 * anything with a fraction keeps the currency's own decimal count.
 */
function fractionDigitsFor(value: number, locale: string, currency: string): number {
  if (Number.isInteger(value)) {
    return 0;
  }
  const resolved = new Intl.NumberFormat(locale, { style: 'currency', currency })
    .resolvedOptions().maximumFractionDigits;
  return resolved ?? 2;
}

export function formatCurrencyAmount(
  value: number,
  currency: string,
  locale: string,
  display: CurrencyDisplay = 'symbol',
): string {
  const amount = Number.isFinite(value) ? value : 0;
  const code = isSupportedCurrency(currency) ? currency : DEFAULT_CURRENCY_CODE;
  const digits = fractionDigitsFor(amount, locale, code);
  return getFormatter(locale, code, display, digits).format(amount);
}

/** Ledger-style amount that always carries its sign, e.g. "+$120" / "-$40". */
export function formatSignedCurrencyAmount(
  value: number,
  currency: string,
  locale: string,
  display: CurrencyDisplay = 'symbol',
): string {
  const formatted = formatCurrencyAmount(Math.abs(value), currency, locale, display);
  return value < 0 ? `-${formatted}` : `+${formatted}`;
}

export function getCurrencySymbol(currency: string, locale: string): string {
  const code = isSupportedCurrency(currency) ? currency : DEFAULT_CURRENCY_CODE;
  const parts = getFormatter(locale, code, 'symbol', 0).formatToParts(0);
  return parts.find((part) => part.type === 'currency')?.value ?? code;
}

export function getCurrencyName(currency: string, locale: string): string {
  try {
    const names = new Intl.DisplayNames([locale], { type: 'currency' });
    return names.of(currency) ?? currency;
  } catch {
    return currency;
  }
}

/** Supported currencies with localized names, sorted for a picker. */
export function getCurrencyOptions(locale: string): CurrencyOption[] {
  return SUPPORTED_CURRENCY_CODES.map((code) => ({
    code,
    name: getCurrencyName(code, locale),
    symbol: getCurrencySymbol(code, locale),
  })).sort((a, b) => a.name.localeCompare(b.name, locale));
}

/** Best guess from the browser's region, used until the doctor picks one. */
export function inferBrowserCurrency(): string {
  const locales = [
    ...(navigator.languages ?? []),
    navigator.language,
  ].filter(Boolean);
  for (const locale of locales) {
    try {
      const region = new Intl.Locale(locale).maximize().region;
      const currency = region ? REGION_CURRENCY[region] : undefined;
      if (isSupportedCurrency(currency)) {
        return currency;
      }
    } catch {
      // Malformed locale tag: try the next one.
    }
  }
  return DEFAULT_CURRENCY_CODE;
}
