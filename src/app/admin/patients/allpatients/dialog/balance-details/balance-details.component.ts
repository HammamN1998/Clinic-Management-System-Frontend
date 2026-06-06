import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {TreatmentModel} from "@core/models/treatment.model";
import {PaymentModel} from "@core/models/payment.model";
import {NgForOf, NgIf} from "@angular/common";
import {isNullOrUndefined} from "@swimlane/ngx-datatable";
import {ThumbYDirective} from "ngx-scrollbar/lib/scrollbar/thumb/thumb.directive";
import { PdfService } from '@core/service/pdf.service';
import { AppointmentModel } from '@core/models/appointment.model';
import { buildBalanceLedger } from '@core/util/balance-ledger.util';
import { TranslateModule } from '@ngx-translate/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { PatientPdfContext } from '@core/models/pdf-document.model';

export interface DialogData {
  treatments: TreatmentModel[];
  payments: PaymentModel[];
  appointments: AppointmentModel[];
  patientName?: string;
  patient?: PatientPdfContext;
}
@Component({
    selector: 'app-balance-details',
    templateUrl: './balance-details.component.html',
    styleUrls: ['./balance-details.component.scss'],
    standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatDialogClose,
    NgForOf,
    NgIf,
    ThumbYDirective,
    TranslateModule,
    MatMenuModule,
    MatIconModule,
  ],
})
export class BalanceDetailsComponent {
  totalBalance = 0;
  /** Loose typing so the template can branch on optional fields like the legacy table. */
  combinedList: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<BalanceDetailsComponent>,
    private pdfService: PdfService,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
  ) {
    const ledger = buildBalanceLedger(
      this.data.treatments,
      this.data.payments,
      this.data.appointments,
    );
    this.combinedList = ledger.combinedList as any[];
    this.totalBalance = ledger.totalBalance;
  }
  onNoClick(): void {
    this.dialogRef.close();
  }

  protected readonly TreatmentModel = TreatmentModel;
  protected readonly isNullOrUndefined = isNullOrUndefined;

  createAnInvoice(): void {
    void this.pdfService
      .downloadPatientBalancePdf({
        treatments: this.data.treatments,
        payments: this.data.payments,
        appointments: this.data.appointments,
        patient: this.data.patient,
        patientName: this.data.patientName,
      })
      .catch(() => {
        /* optional: surface via notification service */
      });
  }

  createSimpleInvoice(): void {
    void this.pdfService
      .downloadPatientSimpleBalancePdf({
        treatments: this.data.treatments,
        payments: this.data.payments,
        appointments: this.data.appointments,
        patient: this.data.patient,
        patientName: this.data.patientName,
      })
      .catch(() => {
        /* optional: surface via notification service */
      });
  }
}
