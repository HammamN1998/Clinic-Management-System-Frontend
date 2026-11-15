export {getAppDateLocale} from './app-locale.util';

export type DashboardRangePreset = 'today' | 'week' | 'month' | 'year';

/** The days a range covers, `end` excluded. Weeks start on Monday; `offset` steps back (negative) from the current range. */
export function getDashboardRangeDates(preset: DashboardRangePreset, offset: number = 0): {start: Date; end: Date} {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === 'today') {
    const start = new Date(startOfToday);
    start.setDate(start.getDate() + offset);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return {start, end};
  }
  if (preset === 'week') {
    const day = startOfToday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(startOfToday);
    start.setDate(start.getDate() + diff + offset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return {start, end};
  }
  if (preset === 'year') {
    const start = new Date(now.getFullYear() + offset, 0, 1);
    const end = new Date(now.getFullYear() + offset + 1, 0, 1);
    return {start, end};
  }
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return {start, end};
}

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
