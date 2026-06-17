export {getAppDateLocale} from './app-locale.util';

export type DashboardRangePreset = 'today' | 'week' | 'month' | 'year';

export function formatDashboardRangeLabel(
  preset: DashboardRangePreset,
  start: Date,
  end: Date,
  locale: string,
): string {
  const lastDay = new Date(end);
  lastDay.setDate(lastDay.getDate() - 1);

  if (preset === 'today') {
    return start.toLocaleDateString(locale, {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'});
  }
  if (preset === 'week') {
    const startLabel = start.toLocaleDateString(locale, {month: 'short', day: 'numeric'});
    const endLabel = lastDay.toLocaleDateString(locale, {month: 'short', day: 'numeric', year: 'numeric'});
    return `${startLabel} – ${endLabel}`;
  }
  if (preset === 'month') {
    return start.toLocaleDateString(locale, {month: 'long', year: 'numeric'});
  }
  return start.toLocaleDateString(locale, {year: 'numeric'});
}
