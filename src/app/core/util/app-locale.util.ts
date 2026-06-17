/** App language codes (match LanguageService / ngx-translate). */
export const APP_LANG_AR = 'ar';
export const APP_LANG_EN = 'en';

export function isArabicLang(lang: string): boolean {
  return lang === APP_LANG_AR;
}

/** BCP 47 locale for DatePipe and toLocaleDateString. */
export function getAppDateLocale(lang: string): string {
  return isArabicLang(lang) ? APP_LANG_AR : APP_LANG_EN;
}
