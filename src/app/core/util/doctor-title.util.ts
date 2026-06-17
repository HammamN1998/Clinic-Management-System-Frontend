const ARABIC_SCRIPT_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

export function getDoctorTitlePrefix(name: string): string {
  return ARABIC_SCRIPT_REGEX.test(name) ? 'د.' : 'DR.';
}
