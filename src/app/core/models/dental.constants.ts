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
  { value: 'none', color: '', labelKey: 'PATIENTS.DENTAL_CHART.CONDITIONS.NONE' },
];

/** Dental specialty used to filter the operation list in the treatment form. */
export type DentalBranch =
  | 'diagnostics'
  | 'preventive'
  | 'directRestorations'
  | 'indirectRestorations'
  | 'endodontics'
  | 'periodontics'
  | 'oralSurgery'
  | 'fixedProsthodontics'
  | 'removableProsthodontics'
  | 'orthodontics'
  | 'pediatric'
  | 'other';

export interface DentalOperationOption {
  value: string;
  labelKey: string;
  branches: DentalBranch[];
  /** Multi-tooth bridge span operations (Zirconia/PFM/Maryland bridge). */
  spanCapable?: boolean;
}

/** Branches shown in the branch selector (UI filter only - not persisted). */
export const DENTAL_BRANCHES: { value: DentalBranch; labelKey: string }[] = [
  { value: 'diagnostics', labelKey: 'PATIENTS.DENTAL_CHART.BRANCHES.DIAGNOSTICS' },
  { value: 'preventive', labelKey: 'PATIENTS.DENTAL_CHART.BRANCHES.PREVENTIVE' },
  { value: 'directRestorations', labelKey: 'PATIENTS.DENTAL_CHART.BRANCHES.DIRECT_RESTORATIONS' },
  { value: 'indirectRestorations', labelKey: 'PATIENTS.DENTAL_CHART.BRANCHES.INDIRECT_RESTORATIONS' },
  { value: 'endodontics', labelKey: 'PATIENTS.DENTAL_CHART.BRANCHES.ENDODONTICS' },
  { value: 'periodontics', labelKey: 'PATIENTS.DENTAL_CHART.BRANCHES.PERIODONTICS' },
  { value: 'oralSurgery', labelKey: 'PATIENTS.DENTAL_CHART.BRANCHES.ORAL_SURGERY' },
  { value: 'fixedProsthodontics', labelKey: 'PATIENTS.DENTAL_CHART.BRANCHES.FIXED_PROSTHODONTICS' },
  { value: 'removableProsthodontics', labelKey: 'PATIENTS.DENTAL_CHART.BRANCHES.REMOVABLE_PROSTHODONTICS' },
  { value: 'orthodontics', labelKey: 'PATIENTS.DENTAL_CHART.BRANCHES.ORTHODONTICS' },
  { value: 'pediatric', labelKey: 'PATIENTS.DENTAL_CHART.BRANCHES.PEDIATRIC' },
  { value: 'other', labelKey: 'PATIENTS.DENTAL_CHART.BRANCHES.OTHER' },
];

const ALL_BRANCHES: DentalBranch[] = DENTAL_BRANCHES.map((b) => b.value);

/** Treatment operations offered in the add/edit treatment form, grouped by branch. */
export const DENTAL_OPERATIONS: DentalOperationOption[] = [
  // Diagnostics
  { value: 'consultation', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.CONSULTATION', branches: ['diagnostics'] },
  { value: 'recallExamination', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.RECALL_EXAMINATION', branches: ['diagnostics'] },
  { value: 'emergencyVisit', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.EMERGENCY_VISIT', branches: ['diagnostics'] },
  { value: 'treatmentPlanning', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.TREATMENT_PLANNING', branches: ['diagnostics'] },
  { value: 'periapicalRadiograph', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.PERIAPICAL_RADIOGRAPH', branches: ['diagnostics'] },
  { value: 'bitewingRadiograph', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.BITEWING_RADIOGRAPH', branches: ['diagnostics'] },
  { value: 'panoramicRadiograph', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.PANORAMIC_RADIOGRAPH', branches: ['diagnostics'] },
  { value: 'cbctReview', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.CBCT_REVIEW', branches: ['diagnostics'] },
  // Preventive dentistry
  { value: 'fluorideApplication', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.FLUORIDE_APPLICATION', branches: ['preventive', 'pediatric'] },
  { value: 'fissureSealant', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.FISSURE_SEALANT', branches: ['preventive', 'pediatric'] },
  { value: 'oralHygieneInstruction', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.ORAL_HYGIENE_INSTRUCTION', branches: ['preventive'] },
  { value: 'desensitizingTreatment', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.DESENSITIZING_TREATMENT', branches: ['preventive'] },
  // Direct restorations
  { value: 'compositeRestoration', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.COMPOSITE_RESTORATION', branches: ['directRestorations'] },
  { value: 'amalgamRestoration', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.AMALGAM_RESTORATION', branches: ['directRestorations'] },
  { value: 'glassIonomerRestoration', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.GLASS_IONOMER_RESTORATION', branches: ['directRestorations'] },
  { value: 'irmRestoration', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.IRM_RESTORATION', branches: ['directRestorations'] },
  { value: 'temporaryFilling', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.TEMPORARY_FILLING', branches: ['directRestorations'] },
  // Indirect restorations
  { value: 'inlay', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.INLAY', branches: ['indirectRestorations'] },
  { value: 'onlay', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.ONLAY', branches: ['indirectRestorations'] },
  { value: 'overlay', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.OVERLAY', branches: ['indirectRestorations'] },
  { value: 'endocrown', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.ENDOCROWN', branches: ['indirectRestorations'] },
  // Endodontics
  { value: 'rootCanalTreatment', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.ROOT_CANAL_TREATMENT', branches: ['endodontics'] },
  { value: 'rootCanalRetreatment', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.ROOT_CANAL_RETREATMENT', branches: ['endodontics'] },
  { value: 'pulpotomy', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.PULPOTOMY', branches: ['endodontics', 'pediatric'] },
  { value: 'pulpectomy', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.PULPECTOMY', branches: ['endodontics', 'pediatric'] },
  { value: 'fiberPost', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.FIBER_POST', branches: ['endodontics'] },
  { value: 'castMetalPostAndCore', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.CAST_METAL_POST_AND_CORE', branches: ['endodontics'] },
  { value: 'apexification', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.APEXIFICATION', branches: ['endodontics'] },
  { value: 'apexogenesis', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.APEXOGENESIS', branches: ['endodontics'] },
  // Periodontics
  { value: 'scalingAndPolishing', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.SCALING_AND_POLISHING', branches: ['periodontics'] },
  { value: 'rootPlaning', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.ROOT_PLANING', branches: ['periodontics'] },
  { value: 'gingivectomy', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.GINGIVECTOMY', branches: ['periodontics'] },
  { value: 'crownLengthening', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.CROWN_LENGTHENING', branches: ['periodontics'] },
  { value: 'gingivalDepigmentation', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.GINGIVAL_DEPIGMENTATION', branches: ['periodontics'] },
  { value: 'flapSurgery', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.FLAP_SURGERY', branches: ['periodontics'] },
  { value: 'gingivalGrafting', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.GINGIVAL_GRAFTING', branches: ['periodontics'] },
  { value: 'frenectomy', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.FRENECTOMY', branches: ['periodontics'] },
  // Oral surgery
  { value: 'simpleExtraction', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.SIMPLE_EXTRACTION', branches: ['oralSurgery'] },
  { value: 'surgicalExtraction', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.SURGICAL_EXTRACTION', branches: ['oralSurgery'] },
  { value: 'implantPlacement', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.IMPLANT_PLACEMENT', branches: ['oralSurgery'] },
  { value: 'sinusLift', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.SINUS_LIFT', branches: ['oralSurgery'] },
  { value: 'boneGrafting', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.BONE_GRAFTING', branches: ['oralSurgery'] },
  { value: 'apicoectomy', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.APICOECTOMY', branches: ['oralSurgery'] },
  { value: 'exposureImpactedTooth', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.EXPOSURE_IMPACTED_TOOTH', branches: ['oralSurgery'] },
  // Fixed prosthodontics
  { value: 'zirconiaCrown', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.ZIRCONIA_CROWN', branches: ['fixedProsthodontics'] },
  { value: 'pfmCrown', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.PFM_CROWN', branches: ['fixedProsthodontics'] },
  { value: 'zirconiaBridge', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.ZIRCONIA_BRIDGE', branches: ['fixedProsthodontics'], spanCapable: true },
  { value: 'pfmBridge', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.PFM_BRIDGE', branches: ['fixedProsthodontics'], spanCapable: true },
  { value: 'porcelainVeneer', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.PORCELAIN_VENEER', branches: ['fixedProsthodontics'] },
  { value: 'compositeVeneer', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.COMPOSITE_VENEER', branches: ['fixedProsthodontics'] },
  { value: 'marylandBridge', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.MARYLAND_BRIDGE', branches: ['fixedProsthodontics'], spanCapable: true },
  { value: 'postAndCoreCrown', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.POST_AND_CORE_CROWN', branches: ['fixedProsthodontics'] },
  // Removable prosthodontics
  { value: 'completeDenture', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.COMPLETE_DENTURE', branches: ['removableProsthodontics'] },
  { value: 'partialDenture', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.PARTIAL_DENTURE', branches: ['removableProsthodontics'] },
  { value: 'immediateDenture', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.IMMEDIATE_DENTURE', branches: ['removableProsthodontics'] },
  { value: 'dentureRepair', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.DENTURE_REPAIR', branches: ['removableProsthodontics'] },
  { value: 'dentureRelining', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.DENTURE_RELINING', branches: ['removableProsthodontics'] },
  { value: 'occlusalSplint', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.OCCLUSAL_SPLINT', branches: ['removableProsthodontics'] },
  // Orthodontics
  { value: 'fixedOrthodonticAppliance', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.FIXED_ORTHODONTIC_APPLIANCE', branches: ['orthodontics'] },
  { value: 'removableOrthodonticAppliance', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.REMOVABLE_ORTHODONTIC_APPLIANCE', branches: ['orthodontics'] },
  { value: 'fixedRetainer', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.FIXED_RETAINER', branches: ['orthodontics'] },
  { value: 'removableRetainer', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.REMOVABLE_RETAINER', branches: ['orthodontics'] },
  { value: 'clearAligners', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.CLEAR_ALIGNERS', branches: ['orthodontics'] },
  { value: 'orthodonticConsultation', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.ORTHODONTIC_CONSULTATION', branches: ['orthodontics'] },
  // Pediatric dentistry
  { value: 'stainlessSteelCrown', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.STAINLESS_STEEL_CROWN', branches: ['pediatric'] },
  { value: 'spaceMaintainer', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.SPACE_MAINTAINER', branches: ['pediatric'] },
  { value: 'primaryToothExtraction', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.PRIMARY_TOOTH_EXTRACTION', branches: ['pediatric', 'oralSurgery'] },
  // Fallback - always visible under every branch filter
  { value: 'other', labelKey: 'PATIENTS.DENTAL_CHART.OPERATIONS.OTHER', branches: ALL_BRANCHES },
];

/** Pre-refactor operation keys still stored on patient charts. */
export const LEGACY_OPERATION_LABEL_KEYS: Record<string, string> = {
  examination: 'PATIENTS.DENTAL_CHART.OPERATIONS.CONSULTATION',
  cleaning: 'PATIENTS.DENTAL_CHART.OPERATIONS.SCALING_AND_POLISHING',
  scaling: 'PATIENTS.DENTAL_CHART.OPERATIONS.SCALING_AND_POLISHING',
  filling: 'PATIENTS.DENTAL_CHART.OPERATIONS.COMPOSITE_RESTORATION',
  fluoride: 'PATIENTS.DENTAL_CHART.OPERATIONS.FLUORIDE_APPLICATION',
  sealant: 'PATIENTS.DENTAL_CHART.OPERATIONS.FISSURE_SEALANT',
  rootCanal: 'PATIENTS.DENTAL_CHART.OPERATIONS.ROOT_CANAL_TREATMENT',
  retreatment: 'PATIENTS.DENTAL_CHART.OPERATIONS.ROOT_CANAL_RETREATMENT',
  postCore: 'PATIENTS.DENTAL_CHART.OPERATIONS.POST_AND_CORE_CROWN',
  scalingRootPlaning: 'PATIENTS.DENTAL_CHART.OPERATIONS.ROOT_PLANING',
  gumGraft: 'PATIENTS.DENTAL_CHART.OPERATIONS.GINGIVAL_GRAFTING',
  crown: 'PATIENTS.DENTAL_CHART.OPERATIONS.ZIRCONIA_CROWN',
  bridge: 'PATIENTS.DENTAL_CHART.OPERATIONS.ZIRCONIA_BRIDGE',
  veneer: 'PATIENTS.DENTAL_CHART.OPERATIONS.PORCELAIN_VENEER',
  dentureComplete: 'PATIENTS.DENTAL_CHART.OPERATIONS.COMPLETE_DENTURE',
  denturePartial: 'PATIENTS.DENTAL_CHART.OPERATIONS.PARTIAL_DENTURE',
  recementation: 'PATIENTS.DENTAL_CHART.OPERATIONS.OTHER',
  extraction: 'PATIENTS.DENTAL_CHART.OPERATIONS.SIMPLE_EXTRACTION',
  wisdomExtraction: 'PATIENTS.DENTAL_CHART.OPERATIONS.SURGICAL_EXTRACTION',
  implant: 'PATIENTS.DENTAL_CHART.OPERATIONS.IMPLANT_PLACEMENT',
  biopsy: 'PATIENTS.DENTAL_CHART.OPERATIONS.OTHER',
  braces: 'PATIENTS.DENTAL_CHART.OPERATIONS.FIXED_ORTHODONTIC_APPLIANCE',
  aligners: 'PATIENTS.DENTAL_CHART.OPERATIONS.CLEAR_ALIGNERS',
  retainer: 'PATIENTS.DENTAL_CHART.OPERATIONS.REMOVABLE_RETAINER',
  ssCrown: 'PATIENTS.DENTAL_CHART.OPERATIONS.STAINLESS_STEEL_CROWN',
  whitening: 'PATIENTS.DENTAL_CHART.OPERATIONS.OTHER',
  bonding: 'PATIENTS.DENTAL_CHART.OPERATIONS.COMPOSITE_VENEER',
};

const LEGACY_OPERATION_BRANCH: Record<string, DentalBranch> = {
  examination: 'diagnostics',
  cleaning: 'periodontics',
  scaling: 'periodontics',
  filling: 'directRestorations',
  fluoride: 'preventive',
  sealant: 'preventive',
  rootCanal: 'endodontics',
  retreatment: 'endodontics',
  postCore: 'fixedProsthodontics',
  scalingRootPlaning: 'periodontics',
  gumGraft: 'periodontics',
  crown: 'fixedProsthodontics',
  bridge: 'fixedProsthodontics',
  veneer: 'fixedProsthodontics',
  dentureComplete: 'removableProsthodontics',
  denturePartial: 'removableProsthodontics',
  recementation: 'fixedProsthodontics',
  extraction: 'oralSurgery',
  wisdomExtraction: 'oralSurgery',
  implant: 'oralSurgery',
  biopsy: 'oralSurgery',
  braces: 'orthodontics',
  aligners: 'orthodontics',
  retainer: 'orthodontics',
  ssCrown: 'pediatric',
  whitening: 'other',
  bonding: 'fixedProsthodontics',
};

/** Operations visible for the selected branch; "all" returns the full catalog. */
export function getOperationsForBranch(branch: DentalBranch | 'all'): DentalOperationOption[] {
  if (branch === 'all') {
    return DENTAL_OPERATIONS;
  }
  return DENTAL_OPERATIONS.filter((op) => op.branches.includes(branch));
}

/** Span-capable bridge operations for the bridge editor operation dropdown. */
export function getSpanOperationsForBranch(branch: DentalBranch | 'all'): DentalOperationOption[] {
  return getOperationsForBranch(branch).filter((op) => op.spanCapable);
}

/** True when the operation is a multi-tooth bridge type (Zirconia/PFM/Maryland). */
export function isSpanCapableOperation(operation: string): boolean {
  if (!operation) {
    return false;
  }
  if (operation === 'bridge') {
    return true;
  }
  return DENTAL_OPERATIONS.some((op) => op.value === operation && op.spanCapable);
}

/** First branch that owns an operation - used to pre-select the branch when editing. */
export function getOperationBranch(operation: string): DentalBranch | 'all' {
  const match = DENTAL_OPERATIONS.find((op) => op.value === operation);
  if (match) {
    return match.branches[0];
  }
  return LEGACY_OPERATION_BRANCH[operation] ?? 'all';
}

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
  const current = DENTAL_OPERATIONS.find((o) => o.value === operation)?.labelKey;
  if (current) {
    return current;
  }
  return LEGACY_OPERATION_LABEL_KEYS[operation]
    ?? 'PATIENTS.DENTAL_CHART.OPERATIONS.OTHER';
}

/**
 * Operations whose completion implies a resulting tooth condition. Used to
 * auto-update the tooth colour when such a treatment is marked done. Operations
 * not listed here (examination, cleaning, scaling, whitening, orthodontics, ...)
 * intentionally leave the condition/colour untouched.
 */
export const OPERATION_CONDITION_MAP: Record<string, ToothCondition> = {
  // Direct restorations
  compositeRestoration: 'filled',
  amalgamRestoration: 'filled',
  glassIonomerRestoration: 'filled',
  irmRestoration: 'filled',
  temporaryFilling: 'filled',
  // Indirect restorations
  inlay: 'filled',
  onlay: 'filled',
  overlay: 'filled',
  endocrown: 'filled',
  // Fixed prosthodontics
  zirconiaCrown: 'crown',
  pfmCrown: 'crown',
  zirconiaBridge: 'crown',
  pfmBridge: 'crown',
  marylandBridge: 'crown',
  porcelainVeneer: 'crown',
  compositeVeneer: 'filled',
  postAndCoreCrown: 'crown',
  stainlessSteelCrown: 'crown',
  // Endodontics
  rootCanalTreatment: 'rootCanal',
  rootCanalRetreatment: 'rootCanal',
  pulpotomy: 'rootCanal',
  pulpectomy: 'rootCanal',
  castMetalPostAndCore: 'crown',
  apexification: 'rootCanal',
  apexogenesis: 'rootCanal',
  // Oral surgery
  simpleExtraction: 'missing',
  surgicalExtraction: 'missing',
  primaryToothExtraction: 'missing',
  implantPlacement: 'implant',
  // Legacy keys (existing charts)
  filling: 'filled',
  bonding: 'filled',
  crown: 'crown',
  bridge: 'crown',
  ssCrown: 'crown',
  veneer: 'crown',
  postCore: 'crown',
  recementation: 'crown',
  rootCanal: 'rootCanal',
  retreatment: 'rootCanal',
  extraction: 'missing',
  wisdomExtraction: 'missing',
  implant: 'implant',
  other: 'other',
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
 * Validate bridge tooth selection and return ids ordered along the arch.
 * Requires at least 2 adjacent teeth in the same arch.
 */
export function orderBridgeTeeth(
  notation: DentalNotation,
  toothIds: string[],
): string[] | null {
  if (toothIds.length < 2) {
    return null;
  }
  return orderAdjacentTeeth(notation, toothIds);
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
