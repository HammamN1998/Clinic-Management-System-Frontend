/**
 * Static option lists, colours, labels and tooth ordering for the dental chart.
 *
 * Tooth ids mirror the path ids baked into each notation's SVG template
 * (fdi: adultTeeth11.. / childTeeth55..; universal: adultTeeth1.. / childTeethA..;
 * palmer: adult{Quadrant}Teeth1.. / child{Quadrant}TeethA..). `TOOTH_SEQUENCES`
 * lists teeth in anatomical order per arch so that bridge adjacency can be
 * validated and span bars drawn end-to-end.
 */
import { DentalNotation, ToothCondition, TreatmentStatus } from './patient.model';

export interface DentalConditionOption {
  value: ToothCondition;
  color: string;
  labelKey: string;
}

/** Tooth conditions with their fill colour and i18n label key. */
export const DENTAL_CONDITION_OPTIONS: DentalConditionOption[] = [
  { value: 'healthy', color: '#8bc34a', labelKey: 'PATIENTS.DENTAL_CHART.CONDITIONS.HEALTHY' },
  { value: 'caries', color: '#e53935', labelKey: 'PATIENTS.DENTAL_CHART.CONDITIONS.CARIES' },
  { value: 'filled', color: '#1e88e5', labelKey: 'PATIENTS.DENTAL_CHART.CONDITIONS.FILLED' },
  { value: 'crown', color: '#fbc02d', labelKey: 'PATIENTS.DENTAL_CHART.CONDITIONS.CROWN' },
  { value: 'missing', color: '#9e9e9e', labelKey: 'PATIENTS.DENTAL_CHART.CONDITIONS.MISSING' },
  { value: 'implant', color: '#00897b', labelKey: 'PATIENTS.DENTAL_CHART.CONDITIONS.IMPLANT' },
  { value: 'rootCanal', color: '#8e24aa', labelKey: 'PATIENTS.DENTAL_CHART.CONDITIONS.ROOT_CANAL' },
  { value: 'other', color: '#607d8b', labelKey: 'PATIENTS.DENTAL_CHART.CONDITIONS.OTHER' },
];

/** Treatment operations offered in the add/edit treatment form. */
export const DENTAL_OPERATIONS: { value: string; labelKey: string }[] = [
  { value: 'examination', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.EXAMINATION' },
  { value: 'cleaning', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.CLEANING' },
  { value: 'filling', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.FILLING' },
  { value: 'extraction', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.EXTRACTION' },
  { value: 'rootCanal', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.ROOT_CANAL' },
  { value: 'crown', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.CROWN' },
  { value: 'bridge', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.BRIDGE' },
  { value: 'implant', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.IMPLANT' },
  { value: 'whitening', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.WHITENING' },
  { value: 'scaling', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.SCALING' },
  { value: 'other', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.OTHER' },
];

export const DENTAL_NOTATIONS: { value: DentalNotation; labelKey: string }[] = [
  { value: 'universal', labelKey: 'PATIENTS.PROFILE.UNIVERSAL_TEETH_DIAGRAM' },
  { value: 'fdi', labelKey: 'PATIENTS.PROFILE.FDI_TEETH_DIAGRAM' },
  { value: 'palmer', labelKey: 'PATIENTS.PROFILE.PALMER_TEETH_DIAGRAM' },
];

/** Status colours reused by badges and bridge bars (orange=pending, green=done). */
export const TREATMENT_STATUS_COLOR: Record<TreatmentStatus, string> = {
  pending: '#fb8c00',
  done: '#43a047',
};

export const DEFAULT_DENTAL_NOTATION: DentalNotation = 'fdi';

export function getConditionOption(condition: ToothCondition): DentalConditionOption | undefined {
  return DENTAL_CONDITION_OPTIONS.find((c) => c.value === condition);
}

export function getConditionColor(condition: ToothCondition): string {
  return getConditionOption(condition)?.color ?? '';
}

export function getOperationLabelKey(operation: string): string {
  return DENTAL_OPERATIONS.find((o) => o.value === operation)?.labelKey
    ?? 'PATIENTS.DENTAL_CHART.OPERATIONS.OTHER';
}

/**
 * Operations whose completion implies a resulting tooth condition. Used to
 * auto-update the tooth colour when such a treatment is marked done. Operations
 * not listed here (examination, cleaning, scaling, whitening, ...) intentionally
 * leave the condition/colour untouched.
 */
export const OPERATION_CONDITION_MAP: Record<string, ToothCondition> = {
  filling: 'filled',
  crown: 'crown',
  extraction: 'missing',
  implant: 'implant',
  rootCanal: 'rootCanal',
};

export function getOperationCondition(operation: string): ToothCondition | null {
  return OPERATION_CONDITION_MAP[operation] ?? null;
}

/** Build "adultTeeth11", "adultTeeth12" ... from numeric tooth numbers. */
function fdiIds(numbers: number[], child = false): string[] {
  return numbers.map((n) => (child ? 'childTeeth' : 'adultTeeth') + n);
}

/**
 * Ordered tooth ids per arch, per notation. Consecutive entries are anatomical
 * neighbours, so a bridge is valid only when its teeth form a contiguous run
 * inside one of these arrays.
 */
export const TOOTH_SEQUENCES: Record<DentalNotation, string[][]> = {
  fdi: [
    // upper permanent: 18..11, 21..28
    fdiIds([18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]),
    // lower permanent: 48..41, 31..38
    fdiIds([48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]),
    // upper primary: 55..51, 61..65
    fdiIds([55, 54, 53, 52, 51, 61, 62, 63, 64, 65], true),
    // lower primary: 85..81, 71..75
    fdiIds([85, 84, 83, 82, 81, 71, 72, 73, 74, 75], true),
  ],
  universal: [
    // upper permanent 1..16, lower permanent 17..32
    Array.from({ length: 16 }, (_, i) => 'adultTeeth' + (i + 1)),
    Array.from({ length: 16 }, (_, i) => 'adultTeeth' + (i + 17)),
    // upper primary A..J, lower primary K..T
    'ABCDEFGHIJ'.split('').map((c) => 'childTeeth' + c),
    'KLMNOPQRST'.split('').map((c) => 'childTeeth' + c),
  ],
  palmer: [
    // upper permanent: upper-right 8..1, upper-left 1..8
    [
      ...[8, 7, 6, 5, 4, 3, 2, 1].map((n) => 'adultUpperRightTeeth' + n),
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => 'adultUpperLeftTeeth' + n),
    ],
    // lower permanent: lower-right 8..1, lower-left 1..8
    [
      ...[8, 7, 6, 5, 4, 3, 2, 1].map((n) => 'adultLowerRightTeeth' + n),
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => 'adultLowerLeftTeeth' + n),
    ],
    // upper primary: upper-right E..A, upper-left A..E
    [
      ...['E', 'D', 'C', 'B', 'A'].map((c) => 'childUpperRightTeeth' + c),
      ...['A', 'B', 'C', 'D', 'E'].map((c) => 'childUpperLeftTeeth' + c),
    ],
    // lower primary: lower-right E..A, lower-left A..E
    [
      ...['E', 'D', 'C', 'B', 'A'].map((c) => 'childLowerRightTeeth' + c),
      ...['A', 'B', 'C', 'D', 'E'].map((c) => 'childLowerLeftTeeth' + c),
    ],
  ],
};

/**
 * Human-readable short label for a tooth id (the number/letter the dentist
 * recognises). Strips the structural prefix from the SVG path id.
 */
export function getToothShortLabel(toothId: string): string {
  const match = toothId.match(/(\d+|[A-Z])$/);
  return match ? match[0] : toothId;
}

/**
 * Validate that the given tooth ids form a contiguous, same-arch run.
 * Returns the ids re-ordered along the arch when valid, otherwise null.
 */
export function orderAdjacentTeeth(
  notation: DentalNotation,
  toothIds: string[],
): string[] | null {
  if (toothIds.length < 2) {
    return null;
  }
  for (const arch of TOOTH_SEQUENCES[notation]) {
    const indices = toothIds.map((id) => arch.indexOf(id));
    if (indices.some((i) => i === -1)) {
      continue; // not all teeth in this arch
    }
    const sorted = [...indices].sort((a, b) => a - b);
    const contiguous = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1);
    if (contiguous) {
      return sorted.map((i) => arch[i]);
    }
  }
  return null;
}

/** True when adding `toothId` to `current` keeps a valid contiguous same-arch run. */
export function canExtendBridge(
  notation: DentalNotation,
  current: string[],
  toothId: string,
): boolean {
  if (current.includes(toothId)) {
    return true; // toggling off is always allowed
  }
  const next = [...current, toothId];
  if (next.length < 2) {
    // First pick: accept any tooth that belongs to one of the arches
    // (adjacency only becomes meaningful from the second tooth onward).
    return TOOTH_SEQUENCES[notation].some((arch) => arch.includes(toothId));
  }
  return orderAdjacentTeeth(notation, next) !== null;
}
