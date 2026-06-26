/**
 * Read/write access to a patient's dental chart and the doctor's preferred
 * notation. All tooth/bridge mutations operate on the patient currently held in
 * `PatientService.dialogData` and persist through `PatientService.updatePatient`
 * (which writes the whole patient document). Optional fields are only assigned
 * when present so Firestore never receives `undefined`.
 */
import { Injectable } from '@angular/core';
import { PatientService } from '@core/service/patient.service';
import { DoctorService } from '@core/service/doctor.service';
import {
  createEmptyDentalChart,
  createEmptyNotationChart,
  DentalNotation,
  NotationDentalChart,
  Patient,
  SpanTreatment,
  ToothChartState,
  ToothCondition,
  ToothTreatmentStep,
  TreatmentStatus,
} from '@core/models/patient.model';
import {
  DEFAULT_DENTAL_NOTATION,
  DENTAL_NOTATIONS,
  getConditionColor,
  getOperationCondition,
} from '@core/models/dental.constants';

const ALL_DENTAL_NOTATIONS: DentalNotation[] = DENTAL_NOTATIONS.map((n) => n.value);

@Injectable({ providedIn: 'root' })
export class DentalChartService {
  /** Session-local form activations; never written to Firestore. */
  private activatedDentalForms = new Map<string, Set<DentalNotation>>();

  constructor(
    private patientService: PatientService,
    private doctorService: DoctorService,
  ) {}

  // ----- doctor-level preferred notation ---------------------------------
  getPreferredNotation(): DentalNotation {
    return this.doctorService.doctor.preferredDentalNotation ?? DEFAULT_DENTAL_NOTATION;
  }

  setPreferredNotation(notation: DentalNotation): Promise<void> {
    return this.doctorService.editDoctor({ preferredDentalNotation: notation });
  }

  // ----- profile form visibility (runtime + saved data) --------------------
  hasFormData(notation: DentalNotation): boolean {
    const chart = this.patient.dentalChart?.charts?.[notation];
    if (!chart) {
      return false;
    }
    return Object.keys(chart.teeth).length > 0 || chart.spanningTreatments.length > 0;
  }

  activateDentalForm(notation: DentalNotation): void {
    const patientId = this.patient.id;
    if (!patientId) {
      return;
    }
    let set = this.activatedDentalForms.get(patientId);
    if (!set) {
      set = new Set();
      this.activatedDentalForms.set(patientId, set);
    }
    set.add(notation);
  }

  isDentalFormActivated(notation: DentalNotation): boolean {
    const patientId = this.patient.id;
    if (!patientId) {
      return false;
    }
    return this.activatedDentalForms.get(patientId)?.has(notation) ?? false;
  }

  isDentalFormTaken(notation: DentalNotation): boolean {
    return this.isDentalFormActivated(notation) || this.hasFormData(notation);
  }

  getVisibleDentalForms(): DentalNotation[] {
    return ALL_DENTAL_NOTATIONS.filter((n) => this.isDentalFormTaken(n));
  }

  // ----- chart access ----------------------------------------------------
  /** Returns the chart bucket for a notation, creating any missing structure. */
  getNotationChart(notation: DentalNotation): NotationDentalChart {
    const patient = this.patient;
    if (!patient.dentalChart || !patient.dentalChart.charts) {
      patient.dentalChart = createEmptyDentalChart();
    }
    if (!patient.dentalChart.charts[notation]) {
      patient.dentalChart.charts[notation] = createEmptyNotationChart();
    }
    return patient.dentalChart.charts[notation];
  }

  getToothState(notation: DentalNotation, toothId: string): ToothChartState | undefined {
    return this.getNotationChart(notation).teeth[toothId];
  }

  // ----- tooth mutations -------------------------------------------------
  setToothCondition(notation: DentalNotation, toothId: string, condition: ToothCondition): void {
    const state = this.ensureToothState(notation, toothId);
    state.condition = condition;
    state.color = getConditionColor(condition);
    this.persist();
  }

  setToothNote(notation: DentalNotation, toothId: string, note: string): void {
    const state = this.ensureToothState(notation, toothId);
    state.note = note ?? '';
    this.persist();
  }

  setBadgePos(notation: DentalNotation, toothId: string, pos: { x: number; y: number }): void {
    const state = this.ensureToothState(notation, toothId);
    state.badgePos = { x: pos.x, y: pos.y };
    this.persist();
  }

  addTreatment(
    notation: DentalNotation,
    toothId: string,
    data: { operation: string; date: string; status: TreatmentStatus; note?: string },
  ): ToothTreatmentStep {
    const step = this.buildTreatment(data);
    const state = this.ensureToothState(notation, toothId);
    state.treatments.push(step);
    this.applyAutoCondition(state);
    this.persist();
    return step;
  }

  updateTreatment(
    notation: DentalNotation,
    toothId: string,
    treatmentId: string,
    data: { operation: string; date: string; status: TreatmentStatus; note?: string },
  ): void {
    const state = this.getToothState(notation, toothId);
    const existing = state?.treatments.find((t) => t.id === treatmentId);
    if (!existing) {
      return;
    }
    Object.assign(existing, this.buildTreatment(data, treatmentId));
    if (!data.note) {
      delete existing.note;
    }
    this.applyAutoCondition(state!);
    this.persist();
  }

  setTreatmentStatus(
    notation: DentalNotation,
    toothId: string,
    treatmentId: string,
    status: TreatmentStatus,
  ): void {
    const state = this.getToothState(notation, toothId);
    const treatment = state?.treatments.find((t) => t.id === treatmentId);
    if (!state || !treatment) {
      return;
    }
    treatment.status = status;
    this.applyAutoCondition(state);
    this.persist();
  }

  deleteTreatment(notation: DentalNotation, toothId: string, treatmentId: string): void {
    const state = this.getToothState(notation, toothId);
    if (!state) {
      return;
    }
    state.treatments = state.treatments.filter((t) => t.id !== treatmentId);
    this.persist();
  }

  // ----- bridge (span) mutations -----------------------------------------
  addBridge(
    notation: DentalNotation,
    data: { operation: string; toothIds: string[]; date: string; status: TreatmentStatus; note?: string },
  ): SpanTreatment {
    const bridge: SpanTreatment = {
      id: this.genId('br'),
      type: 'bridge',
      operation: data.operation,
      toothIds: [...data.toothIds],
      date: data.date,
      status: data.status,
    };
    if (data.note) {
      bridge.note = data.note;
    }
    this.getNotationChart(notation).spanningTreatments.push(bridge);
    this.persist();
    return bridge;
  }

  updateBridge(
    notation: DentalNotation,
    bridgeId: string,
    data: { operation: string; toothIds: string[]; date: string; status: TreatmentStatus; note?: string },
  ): void {
    const bridge = this.getNotationChart(notation).spanningTreatments.find((b) => b.id === bridgeId);
    if (!bridge) {
      return;
    }
    bridge.operation = data.operation;
    bridge.toothIds = [...data.toothIds];
    bridge.date = data.date;
    bridge.status = data.status;
    if (data.note) {
      bridge.note = data.note;
    } else {
      delete bridge.note;
    }
    this.persist();
  }

  deleteBridge(notation: DentalNotation, bridgeId: string): void {
    const chart = this.getNotationChart(notation);
    chart.spanningTreatments = chart.spanningTreatments.filter((b) => b.id !== bridgeId);
    this.persist();
  }

  // ----- internals -------------------------------------------------------
  private get patient(): Patient {
    return this.patientService.getDialogData();
  }

  /**
   * Re-derive the tooth's condition/colour from its most recently created
   * `done` treatment whose operation maps to a condition (filling, crown,
   * extraction, implant, rootCanal). Operations without a mapping leave the
   * colour untouched, so a manually picked condition stays until such a
   * treatment is recorded.
   */
  private applyAutoCondition(state: ToothChartState): void {
    for (let i = state.treatments.length - 1; i >= 0; i--) {
      const t = state.treatments[i];
      if (t.status !== 'done') {
        continue;
      }
      const condition = getOperationCondition(t.operation);
      if (condition) {
        state.condition = condition;
        state.color = getConditionColor(condition);
        return;
      }
    }
  }

  private ensureToothState(notation: DentalNotation, toothId: string): ToothChartState {
    const chart = this.getNotationChart(notation);
    if (!chart.teeth[toothId]) {
      chart.teeth[toothId] = { condition: 'healthy', color: '', note: '', treatments: [] };
    }
    return chart.teeth[toothId];
  }

  /** Builds a clean treatment object, omitting an empty note (no undefined keys). */
  private buildTreatment(
    data: { operation: string; date: string; status: TreatmentStatus; note?: string },
    id?: string,
  ): ToothTreatmentStep {
    const step: ToothTreatmentStep = {
      id: id ?? this.genId('tx'),
      operation: data.operation,
      date: data.date,
      status: data.status,
    };
    if (data.note) {
      step.note = data.note;
    }
    return step;
  }

  private persist(): void {
    this.patientService.updatePatient(this.patient);
  }

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
}
