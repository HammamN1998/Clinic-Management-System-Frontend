import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {TreatmentModel} from "@core/models/treatment.model";
import {PaymentModel} from "@core/models/payment.model";
import {NgForOf, NgIf} from "@angular/common";
import {isNullOrUndefined} from "@swimlane/ngx-datatable";
import {ThumbYDirective} from "ngx-scrollbar/lib/scrollbar/thumb/thumb.directive";
import {PdfService} from "@core/service/pdf.service";
import {AppointmentModel} from "@core/models/appointment.model";

export interface DialogData {
  treatments: TreatmentModel[],
  payments: PaymentModel[],
  appointments: AppointmentModel[],
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
  ],
})
export class BalanceDetailsComponent {
  totalBalance = 0;
  combinedList: any = [];
  unpaidAppointmentsList: AppointmentModel[] = [];

  constructor(
    public dialogRef: MatDialogRef<BalanceDetailsComponent>,
    private pdfService: PdfService,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
  ) {
    this.data.appointments.forEach((appointment) => {
      if (!appointment.costPaid) this.unpaidAppointmentsList.push(appointment);
    })
    this.combinedList = this.data.treatments.concat(this.unpaidAppointmentsList as unknown as TreatmentModel[]);
    this.combinedList = this.combinedList.concat(this.data.payments as unknown as TreatmentModel[]);
    this.combinedList.sort((a: TreatmentModel|PaymentModel|AppointmentModel, b: TreatmentModel|PaymentModel|AppointmentModel) => b.date.toDate().getTime() - a.date.toDate().getTime());

    this.data.treatments.forEach((treatment) => this.totalBalance+= treatment.price - treatment.discount);
    this.data.appointments.forEach((appointment) => this.totalBalance += !appointment.costPaid ? appointment.cost : 0);
    this.data.payments.forEach((payment) => this.totalBalance-= payment.amount);
  }
  onNoClick(): void {
    this.dialogRef.close();
  }

  protected readonly TreatmentModel = TreatmentModel;
  protected readonly isNullOrUndefined = isNullOrUndefined;

  createAnInvoice() {
    this.pdfService.generatePatientBalanceInvoice();
  }
}
