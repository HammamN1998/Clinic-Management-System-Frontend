import * as firestore from "firebase/firestore";

/**
 * Dental chart model (the dedicated odontogram page).
 *
 * Per-notation data lives under `dentalChart.charts[notation]`. The profile
 * page chooses notation when creating or opening a form; visibility in Existing
 * Forms is session-local activation and/or saved chart data in that bucket.
 */
export type DentalNotation = 'fdi' | 'universal' | 'palmer';

export type ToothCondition =
  | 'healthy'
  | 'caries'
  | 'filled'
  | 'crown'
  | 'missing'
  | 'implant'
  | 'rootCanal'
  | 'none'
  | 'other';

export type TreatmentStatus = 'pending' | 'done';

/** A single treatment step recorded on one tooth. */
export interface ToothTreatmentStep {
  id: string;
  operation: string;       // operation key from DENTAL_OPERATIONS
  date: string;            // ISO date (yyyy-mm-dd) - simpler than nested Timestamps
  status: TreatmentStatus;
  note?: string;           // optional - omitted (never undefined) before persisting
}

/** Full chart state for one tooth. */
export interface ToothChartState {
  condition: ToothCondition;
  color: string;           // resolved condition colour, cached for quick fill
  note: string;
  treatments: ToothTreatmentStep[];
  /** Persisted badge-card position in SVG user coords; unset => use auto-layout. */
  badgePos?: { x: number; y: number };
}

/** A treatment spanning several adjacent teeth (e.g. a bridge). */
export interface SpanTreatment {
  id: string;
  type: 'bridge';
  operation: string;
  toothIds: string[];      // ordered, adjacent teeth in the same arch
  date: string;            // ISO date (yyyy-mm-dd)
  status: TreatmentStatus;
  note?: string;
}

export interface NotationDentalChart {
  teeth: { [toothId: string]: ToothChartState };
  spanningTreatments: SpanTreatment[];
}

export interface DentalChart {
  charts: { [n in DentalNotation]: NotationDentalChart };
}

export function createEmptyNotationChart(): NotationDentalChart {
  return { teeth: {}, spanningTreatments: [] };
}

export function createEmptyDentalChart(): DentalChart {
  return {
    charts: {
      fdi: createEmptyNotationChart(),
      universal: createEmptyNotationChart(),
      palmer: createEmptyNotationChart(),
    },
  };
}
export interface Attachment {
  name: string,
  type: string,
  url: string,
  size: number,
}
export class Patient {
  id: string = '';
  firstName: string = '';
  lastName: string = '';
  gender: string = '';
  phoneNumber: string = '';
  birthDate: firestore.Timestamp = firestore.Timestamp.now();
  email: string = '';
  maritalState: string = '';
  address: string = '';
  bloodGroup: string = '';
  bloodPressure: string = '';
  condition: string = '';
  img: string = '';
  imgSize: number = 0;
  doctorId: string = '';
  attachments: Attachment[] = [];
  dentalChart: DentalChart = createEmptyDentalChart();
  createdAt: firestore.Timestamp = firestore.Timestamp.now();
  notes: string = '';
  weight: string = '0';

  constructor() {}
}
