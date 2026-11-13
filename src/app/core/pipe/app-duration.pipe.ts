import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * Formats a number of minutes as "45 min", "1 h" or "1 h 30 min", e.g. `{{ 90 | appDuration }}`.
 *
 * Impure so the label follows language changes.
 */
@Pipe({
  name: 'appDuration',
  standalone: true,
  pure: false,
})
export class AppDurationPipe implements PipeTransform {
  constructor(private readonly translate: TranslateService) {}

  transform(value: number | null | undefined): string {
    const total = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    if (!hours) {
      return this.translate.instant('APPOINTMENT_DURATION.MINUTES', { minutes });
    }
    if (!minutes) {
      return this.translate.instant('APPOINTMENT_DURATION.HOURS', { hours });
    }
    return this.translate.instant('APPOINTMENT_DURATION.HOURS_MINUTES', { hours, minutes });
  }
}
