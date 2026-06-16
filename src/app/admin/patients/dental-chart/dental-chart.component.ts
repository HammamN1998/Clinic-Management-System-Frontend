/**
 * Dental chart page: a notation selector plus a vertical split with the
 * odontogram on the left and the tooth/bridge details on the right.
 *
 * The page owns the interaction state (selection, the bridge multi-select
 * buffer) and re-snapshots the diagram inputs (`toothStates` /
 * `spanningTreatments`) into new references whenever the underlying chart
 * changes, so the diagram's `ngOnChanges` recomputes the overlay.
 */
import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { FdiTeethDiagramComponent } from '@shared/components/dentist/fdi-teeth-diagram/fdi-teeth-diagram.component';
import { UniversalTeethDiagramComponent } from '@shared/components/dentist/universal-teeth-diagram/universal-teeth-diagram.component';
import { PalmerTeethDiagramComponent } from '@shared/components/dentist/palmer-teeth-diagram/palmer-teeth-diagram.component';
import { ToothDetailPanelComponent } from '@shared/components/dentist/tooth-detail-panel/tooth-detail-panel.component';
import { PatientService } from '@core/service/patient.service';
import { DentalChartService } from '@core/service/dental-chart.service';
import { NotificationService } from '@core/service/notification.service';
import { TranslateService } from '@ngx-translate/core';
import {
  DentalNotation,
  SpanTreatment,
  ToothChartState,
} from '@core/models/patient.model';
import { canExtendBridge, DENTAL_NOTATIONS } from '@core/models/dental.constants';

@Component({
  selector: 'app-dental-chart',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BreadcrumbComponent,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
    FdiTeethDiagramComponent,
    UniversalTeethDiagramComponent,
    PalmerTeethDiagramComponent,
    ToothDetailPanelComponent,
  ],
  templateUrl: './dental-chart.component.html',
  styleUrl: './dental-chart.component.scss',
})
export class DentalChartComponent implements OnInit {
  readonly notations = DENTAL_NOTATIONS;

  activeNotation: DentalNotation = 'fdi';
  mode: 'normal' | 'bridge' = 'normal';

  selectedToothId: string | null = null;
  selectedBridgeId: string | null = null;
  highlightedTreatmentId: string | null = null;

  bridgeDraft: string[] = [];
  editingBridgeId: string | null = null;

  // Snapshots passed to the diagram (new references => re-render on change).
  toothStates: { [toothId: string]: ToothChartState } = {};
  spanningTreatments: SpanTreatment[] = [];

  constructor(
    private patientService: PatientService,
    private dentalChartService: DentalChartService,
    private notificationService: NotificationService,
    private translate: TranslateService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (!this.patientService.getDialogData().id) {
      this.router.navigate(['/admin/patients/all-patients']);
      return;
    }
    // The notation is decided by the diagram the doctor opened this page from
    // (passed via navigation state); fall back to the saved preference.
    const navNotation = (history.state?.notation ?? null) as DentalNotation | null;
    this.activeNotation = navNotation ?? this.dentalChartService.getPreferredNotation();
    this.snapshot();
  }

  get patientName(): string {
    const p = this.patientService.getDialogData();
    return `${p.firstName} ${p.lastName}`.trim();
  }

  // ----- notation --------------------------------------------------------
  changeNotation(notation: DentalNotation): void {
    this.activeNotation = notation;
    this.resetInteraction();
    this.snapshot();
    // Persist the doctor's preferred notation (best-effort).
    void this.dentalChartService.setPreferredNotation(notation);
  }

  // ----- diagram events --------------------------------------------------
  onToothSelect(toothId: string): void {
    if (this.mode === 'bridge') {
      this.toggleBridgeTooth(toothId);
      return;
    }
    this.selectedToothId = toothId;
    this.selectedBridgeId = null;
    this.highlightedTreatmentId = null;
  }

  onTreatmentSelect(event: { toothId: string; treatmentId: string }): void {
    this.mode = 'normal';
    this.selectedToothId = event.toothId;
    this.highlightedTreatmentId = event.treatmentId;
    this.selectedBridgeId = null;
  }

  onBridgeSelect(bridgeId: string): void {
    const bridge = this.spanningTreatments.find((b) => b.id === bridgeId);
    if (bridge) {
      this.enterBridgeEdit(bridge);
    }
  }

  onBadgeMoved(event: { toothId: string; pos: { x: number; y: number } }): void {
    this.dentalChartService.setBadgePos(this.activeNotation, event.toothId, event.pos);
    this.snapshot();
  }

  // ----- bridge flow -----------------------------------------------------
  startBridge(): void {
    this.mode = 'bridge';
    this.bridgeDraft = [];
    this.editingBridgeId = null;
    this.selectedToothId = null;
    this.selectedBridgeId = null;
  }

  cancelBridge(): void {
    this.resetInteraction();
  }

  enterBridgeEdit(bridge: SpanTreatment): void {
    this.mode = 'bridge';
    this.editingBridgeId = bridge.id;
    this.bridgeDraft = [...bridge.toothIds];
    this.selectedBridgeId = bridge.id;
    this.selectedToothId = null;
  }

  onBridgeSaved(): void {
    this.resetInteraction();
  }

  /** Close the detail panel: clear the current tooth/bridge selection. */
  closePanel(): void {
    this.resetInteraction();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.mode === 'bridge') {
      this.cancelBridge();
    }
  }

  // ----- panel changes ---------------------------------------------------
  onPanelChanged(): void {
    this.snapshot();
  }

  // ----- internals -------------------------------------------------------
  private toggleBridgeTooth(toothId: string): void {
    if (this.bridgeDraft.includes(toothId)) {
      this.bridgeDraft = this.bridgeDraft.filter((id) => id !== toothId);
      return;
    }
    if (!canExtendBridge(this.activeNotation, this.bridgeDraft, toothId)) {
      this.notificationService.showSnackBarNotification(
        'snackbar-danger',
        this.translate.instant('PATIENTS.DENTAL_CHART.BRIDGE.NOT_ADJACENT'),
        'bottom',
        'center',
      );
      return;
    }
    this.bridgeDraft = [...this.bridgeDraft, toothId];
  }

  private resetInteraction(): void {
    this.mode = 'normal';
    this.bridgeDraft = [];
    this.editingBridgeId = null;
    this.selectedToothId = null;
    this.selectedBridgeId = null;
    this.highlightedTreatmentId = null;
  }

  /** Re-read the active chart into fresh references for change detection. */
  private snapshot(): void {
    const chart = this.dentalChartService.getNotationChart(this.activeNotation);
    this.toothStates = { ...chart.teeth };
    this.spanningTreatments = [...chart.spanningTreatments];
  }
}
