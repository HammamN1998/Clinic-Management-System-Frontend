/** Firestore stores some flags as "true"/"false" strings. Treat anything that
 * is not the literal "false" as enabled (so missing/undefined defaults to on). */
export function isTruthyString(value?: string): boolean {
  return value !== 'false';
}
