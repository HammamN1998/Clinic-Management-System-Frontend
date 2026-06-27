/**
 * Right-hand details panel for the dental chart.
 *
 * Two faces driven by `bridgeMode`:
 *  - tooth mode: condition swatches, a tooth note, and a treatment list with an
 *    add/edit form, status toggle and delete.
 *  - bridge mode: an editor for the multi-tooth bridge currently being drawn
 *    (the page owns the selected-teeth buffer) plus a list of existing bridges.
 *
 * The panel is presentational: all persistence goes through `DentalChartService`
 * and it emits `changed` so the page can re-snapshot the diagram inputs.
 */
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DentalChartService } from '@core/service/dental-chart.service';
import { NotificationService } from '@core/service/notification.service';
import { DeleteConfirmDialogService } from '@shared/components/delete-confirm-dialog/delete-confirm-dialog.service';
import {
  DentalNotation,
  SpanTreatment,
  ToothCondition,
  ToothTreatmentStep,
  TreatmentStatus,
} from '@core/models/patient.model';
import {
  DENTAL_BRANCHES,
  DENTAL_CONDITION_OPTIONS,
  DentalBranch,
  getConditionOption,
  getOperationBranch,
  getOperationLabelKey,
  getOperationsForBranch,
  getSpanOperationsForBranch,
  getToothShortLabel,
  isSpanCapableOperation,
  orderBridgeTeeth,
} from '@core/models/dental.constants';

export interface BridgeFormSeed {
  operation: string;
  date: Date;
  status: TreatmentStatus;
  note: string;
}

@Component({
  selector: 'app-tooth-detail-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    TranslateModule,
  ],
  templateUrl: './tooth-detail-panel.component.html',
  styleUrl: './tooth-detail-panel.component.scss',
})
export class ToothDetailPanelComponent implements OnChanges {
  @Input() notation: DentalNotation = 'fdi';
  @Input() selectedToothId: string | null = null;
  @Input() bridgeMode = false;
  @Input() bridgeDraftToothIds: string[] = [];
  @Input() bridgeFormSeed: BridgeFormSeed | null = null;
  @Input() editingBridgeId: string | null = null;
  @Input() selectedBridgeId: string | null = null;
  @Input() highlightedTreatmentId: string | null = null;

  /** A mutation was persisted - the page should re-snapshot diagram inputs. */
  @Output() changed = new EventEmitter<void>();
  @Output() cancelBridge = new EventEmitter<void>();
  @Output() editBridge = new EventEmitter<SpanTreatment>();
  /** User picked a bridge operation on a tooth — parent enters bridge mode. */
  @Output() startBridge = new EventEmitter<BridgeFormSeed & { toothId: string }>();
  /** Bridge saved successfully - the page should leave bridge mode. */
  @Output() bridgeSaved = new EventEmitter<void>();
  /** Doctor closed the panel - the page should clear the selection. */
  @Output() closePanel = new EventEmitter<void>();

  readonly conditionOptions = DENTAL_CONDITION_OPTIONS;
  /** Branch selector options: "All" plus each dental specialty. */
  readonly branchOptions: { value: DentalBranch | 'all'; labelKey: string }[] = [
    { value: 'all', labelKey: 'PATIENTS.DENTAL_CHART.BRANCHES.ALL' },
    ...DENTAL_BRANCHES,
  ];

  /** UI-only branch filter for the tooth treatment form. */
  treatmentBranch: DentalBranch | 'all' = 'all';

  /** Bridge types only (Zirconia / PFM / Maryland). */
  readonly spanBridgeOperations = getSpanOperationsForBranch('all');

  get treatmentOperations() {
    return getOperationsForBranch(this.treatmentBranch);
  }

  // Tooth note + treatment form drafts.
  noteDraft = '';
  treatmentForm = this.emptyTreatmentForm();
  editingTreatmentId: string | null = null;

  // Bridge form drafts.
  bridgeForm = this.emptyBridgeForm();
  private consumedBridgeSeed = false;

  constructor(
    private dentalChartService: DentalChartService,
    private notificationService: NotificationService,
    private deleteConfirmDialog: DeleteConfirmDialogService,
    private translate: TranslateService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedToothId']) {
      this.noteDraft = this.toothState?.note ?? '';
      this.resetTreatmentForm();
    }
    // Clicking a treatment's badge row in the diagram highlights it here and
    // loads it into the edit form (highlight == being edited).
    if (changes['highlightedTreatmentId']) {
      this.applyHighlightedTreatment();
    }
    if (changes['editingBridgeId'] || changes['bridgeMode'] || changes['bridgeFormSeed']) {
      this.syncBridgeForm();
    }
  }

  /** Load the externally-highlighted treatment (badge row click) into the form. */
  private applyHighlightedTreatment(): void {
    if (!this.highlightedTreatmentId) {
      return;
    }
    const treatment = this.treatments.find((t) => t.id === this.highlightedTreatmentId);
    if (treatment) {
      this.editTreatment(treatment);
    }
  }

  // ----- tooth getters ---------------------------------------------------
  get toothState() {
    return this.selectedToothId
      ? this.dentalChartService.getToothState(this.notation, this.selectedToothId)
      : undefined;
  }

  get treatments(): ToothTreatmentStep[] {
    return this.toothState?.treatments ?? [];
  }

  get currentCondition(): ToothCondition | null {
    return this.toothState?.condition ?? null;
  }

  get bridges(): SpanTreatment[] {
    return this.dentalChartService.getNotationChart(this.notation).spanningTreatments;
  }

  toothLabel(toothId: string): string {
    return getToothShortLabel(toothId);
  }

  operationLabelKey(operation: string): string {
    return getOperationLabelKey(operation);
  }

  get currentConditionLabelKey(): string | null {
    return this.currentCondition ? getConditionOption(this.currentCondition)?.labelKey ?? null : null;
  }

  // ----- condition + note ------------------------------------------------
  selectCondition(condition: ToothCondition): void {
    if (!this.selectedToothId) {
      return;
    }
    this.dentalChartService.setToothCondition(this.notation, this.selectedToothId, condition);
    this.afterChange();
  }

  saveNote(): void {
    if (!this.selectedToothId) {
      return;
    }
    // Skip the save (and "Saved" toast) when the note hasn't actually changed,
    // so a plain focus-out doesn't spam notifications.
    if (this.noteDraft === (this.toothState?.note ?? '')) {
      return;
    }
    this.dentalChartService.setToothNote(this.notation, this.selectedToothId, this.noteDraft);
    this.afterChange();
  }

  // ----- treatments ------------------------------------------------------
  submitTreatment(): void {
    if (!this.selectedToothId || !this.treatmentForm.operation) {
      return;
    }
    if (isSpanCapableOperation(this.treatmentForm.operation)) {
      this.emitStartBridgeFromTreatment();
      return;
    }
    const data = {
      operation: this.treatmentForm.operation,
      date: this.formatDate(this.treatmentForm.date),
      status: this.treatmentForm.status,
      note: this.treatmentForm.note?.trim() || undefined,
    };
    if (this.editingTreatmentId) {
      this.dentalChartService.updateTreatment(this.notation, this.selectedToothId, this.editingTreatmentId, data);
    } else {
      this.dentalChartService.addTreatment(this.notation, this.selectedToothId, data);
    }
    this.resetTreatmentForm();
    this.afterChange();
  }

  editTreatment(treatment: ToothTreatmentStep): void {
    this.editingTreatmentId = treatment.id;
    this.treatmentBranch = getOperationBranch(treatment.operation);
    this.treatmentForm = {
      operation: treatment.operation,
      date: this.parseDate(treatment.date),
      status: treatment.status,
      note: treatment.note ?? '',
    };
  }

  onTreatmentBranchChange(): void {
    if (!this.treatmentForm.operation) {
      return;
    }
    const stillVisible = this.treatmentOperations.some((op) => op.value === this.treatmentForm.operation);
    if (!stillVisible) {
      this.treatmentForm.operation = '';
    }
  }

  onTreatmentOperationChange(): void {
    if (isSpanCapableOperation(this.treatmentForm.operation)) {
      this.emitStartBridgeFromTreatment();
    }
  }

  private emitStartBridgeFromTreatment(): void {
    if (!this.selectedToothId || !isSpanCapableOperation(this.treatmentForm.operation)) {
      return;
    }
    this.startBridge.emit({
      toothId: this.selectedToothId,
      operation: this.treatmentForm.operation,
      date: this.treatmentForm.date,
      status: this.treatmentForm.status,
      note: this.treatmentForm.note?.trim() ?? '',
    });
    this.resetTreatmentForm();
  }

  cancelTreatmentEdit(): void {
    this.resetTreatmentForm();
  }

  toggleStatus(treatment: ToothTreatmentStep): void {
    if (!this.selectedToothId) {
      return;
    }
    const next: TreatmentStatus = treatment.status === 'done' ? 'pending' : 'done';
    this.dentalChartService.setTreatmentStatus(this.notation, this.selectedToothId, treatment.id, next);
    this.afterChange();
  }

  deleteTreatment(treatment: ToothTreatmentStep): void {
    if (!this.selectedToothId) {
      return;
    }
    const toothId = this.selectedToothId;
    const message = this.translate.instant('PATIENTS.DENTAL_CHART.MESSAGES.DELETE_TREATMENT_CONFIRM');
    this.deleteConfirmDialog.open(message).afterClosed().subscribe((result) => {
      if (result === 1) {
        this.dentalChartService.deleteTreatment(this.notation, toothId, treatment.id);
        this.afterChange();
      }
    });
  }

  // ----- bridges ---------------------------------------------------------
  saveBridge(): void {
    const ordered = orderBridgeTeeth(this.notation, this.bridgeDraftToothIds);
    if (!ordered?.length) {
      this.notify('PATIENTS.DENTAL_CHART.BRIDGE.INVALID_SELECTION', 'snackbar-danger');
      return;
    }
    if (!this.bridgeForm.operation) {
      return;
    }
    const data = {
      operation: this.bridgeForm.operation,
      toothIds: ordered,
      date: this.formatDate(this.bridgeForm.date),
      status: this.bridgeForm.status,
      note: this.bridgeForm.note?.trim() || undefined,
    };
    if (this.editingBridgeId) {
      this.dentalChartService.updateBridge(this.notation, this.editingBridgeId, data);
    } else {
      this.dentalChartService.addBridge(this.notation, data);
    }
    this.afterChange();
    this.bridgeSaved.emit();
  }

  deleteBridge(bridge: SpanTreatment): void {
    const message = this.translate.instant('PATIENTS.DENTAL_CHART.MESSAGES.DELETE_BRIDGE_CONFIRM');
    this.deleteConfirmDialog.open(message).afterClosed().subscribe((result) => {
      if (result === 1) {
        this.dentalChartService.deleteBridge(this.notation, bridge.id);
        this.afterChange();
      }
    });
  }

  bridgeTeethLabel(bridge: SpanTreatment): string {
    return bridge.toothIds.map((id) => getToothShortLabel(id)).join('-');
  }

  get draftTeethLabel(): string {
    const ordered = orderBridgeTeeth(this.notation, this.bridgeDraftToothIds);
    return (ordered ?? this.bridgeDraftToothIds).map((id) => getToothShortLabel(id)).join('-');
  }

  // ----- close -----------------------------------------------------------
  /** Close the panel, warning first if the open form holds unsaved edits. */
  requestClose(): void {
    if (!this.hasUnsavedChanges()) {
      this.closePanel.emit();
      return;
    }
    const message = this.translate.instant('PATIENTS.DENTAL_CHART.MESSAGES.UNSAVED_CONFIRM');
    this.deleteConfirmDialog.open(message, 'COMMON.DISCARD').afterClosed().subscribe((result) => {
      if (result === 1) {
        this.closePanel.emit();
      }
    });
  }

  /** True when the currently open editor has edits that were not persisted. */
  hasUnsavedChanges(): boolean {
    if (this.bridgeMode) {
      return this.hasUnsavedBridge();
    }
    if (!this.selectedToothId) {
      return false;
    }
    const noteDirty = this.noteDraft !== (this.toothState?.note ?? '');
    return noteDirty || this.isTreatmentFormDirty();
  }

  /** True when the treatment form differs from the treatment it represents. */
  private isTreatmentFormDirty(): boolean {
    if (this.editingTreatmentId) {
      // Editing an existing treatment: only dirty if a field actually changed.
      const original = this.treatments.find((t) => t.id === this.editingTreatmentId);
      if (!original) {
        return false;
      }
      return (
        this.treatmentForm.operation !== original.operation ||
        this.treatmentForm.status !== original.status ||
        (this.treatmentForm.note?.trim() ?? '') !== (original.note ?? '') ||
        this.formatDate(this.treatmentForm.date) !== original.date
      );
    }
    // Composing a new treatment: dirty once an operation or note is entered.
    return this.treatmentForm.operation !== '' || (this.treatmentForm.note?.trim() ?? '') !== '';
  }

  private hasUnsavedBridge(): boolean {
    if (this.editingBridgeId) {
      const existing = this.bridges.find((b) => b.id === this.editingBridgeId);
      if (!existing) {
        return false;
      }
      const teethChanged =
        (orderBridgeTeeth(this.notation, this.bridgeDraftToothIds) ?? this.bridgeDraftToothIds)
          .join('-') !== existing.toothIds.join('-');
      const formChanged =
        this.bridgeForm.operation !== existing.operation ||
        this.bridgeForm.status !== existing.status ||
        (this.bridgeForm.note?.trim() ?? '') !== (existing.note ?? '') ||
        this.formatDate(this.bridgeForm.date) !== existing.date;
      return teethChanged || formChanged;
    }
    // New bridge: any picked teeth or a typed note counts as unsaved work.
    return this.bridgeDraftToothIds.length > 0 || (this.bridgeForm.note?.trim() ?? '') !== '';
  }

  // ----- internals -------------------------------------------------------
  private afterChange(showSnack = true): void {
    if (showSnack) {
      this.notify('PATIENTS.DENTAL_CHART.MESSAGES.SAVED', 'black');
    }
    this.changed.emit();
  }

  private notify(key: string, color: string): void {
    this.notificationService.showSnackBarNotification(
      color,
      this.translate.instant(key),
      'bottom',
      'center',
    );
  }

  private resetTreatmentForm(): void {
    this.editingTreatmentId = null;
    this.treatmentBranch = 'all';
    this.treatmentForm = this.emptyTreatmentForm();
  }

  private syncBridgeForm(): void {
    if (!this.bridgeMode) {
      this.consumedBridgeSeed = false;
      return;
    }
    const existing = this.editingBridgeId
      ? this.bridges.find((b) => b.id === this.editingBridgeId)
      : undefined;
    if (existing) {
      this.bridgeForm = {
        operation: this.normalizeBridgeOperation(existing.operation),
        date: this.parseDate(existing.date),
        status: existing.status,
        note: existing.note ?? '',
      };
      return;
    }
    if (this.bridgeFormSeed && !this.consumedBridgeSeed) {
      this.bridgeForm = {
        operation: this.bridgeFormSeed.operation,
        date: this.bridgeFormSeed.date,
        status: this.bridgeFormSeed.status,
        note: this.bridgeFormSeed.note,
      };
      this.consumedBridgeSeed = true;
      return;
    }
    if (!this.consumedBridgeSeed) {
      this.bridgeForm = this.emptyBridgeForm();
    }
  }

  private emptyTreatmentForm() {
    return { operation: '', date: new Date(), status: 'pending' as TreatmentStatus, note: '' };
  }

  private emptyBridgeForm() {
    return { operation: '', date: new Date(), status: 'pending' as TreatmentStatus, note: '' };
  }

  /** Legacy span operation keys pre-refactor catalog. */
  private normalizeBridgeOperation(operation: string): string {
    if (operation === 'bridge') {
      return '';
    }
    return getSpanOperationsForBranch('all').some((op) => op.value === operation)
      ? operation
      : '';
  }

  /** Datepicker Date -> persisted ISO day (yyyy-mm-dd), using local parts to avoid TZ shifts. */
  private formatDate(date: Date): string {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return new Date().toISOString().slice(0, 10);
    }
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Persisted ISO day (yyyy-mm-dd) -> local Date for the datepicker. */
  private parseDate(value: string): Date {
    const parts = (value || '').split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return new Date();
  }
}
