import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { FirebaseAuthenticationService } from '../../authentication/services/firebase-authentication.service';
import {
  CurrencyDisplay,
  CurrencyOption,
  formatCurrencyAmount,
  formatSignedCurrencyAmount,
  getCurrencyLocale,
  getCurrencyName,
  getCurrencyOptions,
  getCurrencySymbol,
  inferBrowserCurrency,
  isSupportedCurrency,
} from '@core/util/currency.util';

/**
 * Single source of truth for money formatting. The clinic currency comes from
 * the doctor's profile setting; until one is chosen we guess from the browser
 * region so a new doctor anywhere in the world sees something sensible.
 */
@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  private readonly inferredCurrency = inferBrowserCurrency();
  private formattedCache = new Map<string, string>();
  private optionsCache: { locale: string; options: CurrencyOption[] } | null = null;

  constructor(
    private readonly auth: FirebaseAuthenticationService,
    private readonly translate: TranslateService,
  ) {}

  /** ISO 4217 code used for every amount the doctor sees. */
  get code(): string {
    const saved = this.auth.currentUserValue?.currency;
    if (isSupportedCurrency(saved)) {
      return saved;
    }
    return this.inferredCurrency;
  }

  get locale(): string {
    return getCurrencyLocale(this.translate.currentLang);
  }

  get symbol(): string {
    return getCurrencySymbol(this.code, this.locale);
  }

  get name(): string {
    return getCurrencyName(this.code, this.locale);
  }

  /** True once the doctor has explicitly picked a currency. */
  get isExplicitlySet(): boolean {
    return isSupportedCurrency(this.auth.currentUserValue?.currency);
  }

  /** Options for the profile picker, localized and sorted by name. */
  get options(): CurrencyOption[] {
    const locale = this.locale;
    if (this.optionsCache?.locale !== locale) {
      this.optionsCache = { locale, options: getCurrencyOptions(locale) };
    }
    return this.optionsCache.options;
  }

  /** e.g. "$120" — the default for on-screen amounts. */
  format(value: number, display: CurrencyDisplay = 'symbol'): string {
    return this.cached(value, display, false, formatCurrencyAmount);
  }

  /** e.g. "+$120" / "-$40" — for ledgers where direction matters. */
  formatSigned(value: number, display: CurrencyDisplay = 'symbol'): string {
    return this.cached(value, display, true, formatSignedCurrencyAmount);
  }

  /**
   * Money for generated documents. Invoices go to patients, accountants and
   * banks, so they always carry the ISO code in Latin digits instead of a
   * symbol that may be missing from the PDF fonts.
   */
  formatForDocument(value: number): string {
    return formatCurrencyAmount(value, this.code, 'en', 'code');
  }

  formatSignedForDocument(value: number): string {
    return formatSignedCurrencyAmount(value, this.code, 'en', 'code');
  }

  private cached(
    value: number,
    display: CurrencyDisplay,
    signed: boolean,
    format: (v: number, c: string, l: string, d: CurrencyDisplay) => string,
  ): string {
    const code = this.code;
    const locale = this.locale;
    const key = `${code}|${locale}|${display}|${signed}|${value}`;
    let formatted = this.formattedCache.get(key);
    if (formatted === undefined) {
      // The pipe is impure, so keep the cache from growing without bound.
      if (this.formattedCache.size > 2000) {
        this.formattedCache.clear();
      }
      formatted = format(value, code, locale, display);
      this.formattedCache.set(key, formatted);
    }
    return formatted;
  }
}
