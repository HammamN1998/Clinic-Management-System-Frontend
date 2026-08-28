import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyService } from '@core/service/currency.service';

/**
 * Formats an amount in the doctor's clinic currency, e.g. `{{ 120 | appCurrency }}`.
 * Pass `true` for ledger amounts that should always show their sign.
 *
 * Impure because the currency and language are settings rather than inputs;
 * `CurrencyService` memoizes the formatted strings.
 */
@Pipe({
  name: 'appCurrency',
  standalone: true,
  pure: false,
})
export class AppCurrencyPipe implements PipeTransform {
  constructor(private readonly currency: CurrencyService) {}

  transform(value: number | null | undefined, signed = false): string {
    const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return signed ? this.currency.formatSigned(amount) : this.currency.format(amount);
  }
}
