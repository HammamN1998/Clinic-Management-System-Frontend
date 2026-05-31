import { Component, AfterViewInit, ViewChild } from '@angular/core';
import { PatientService } from '@core/service/patient.service';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { Patient } from '@core/models/patient.model';
import { AppointmentModel } from '@core/models/appointment.model';
import { PaymentModel } from '@core/models/payment.model';
import { TreatmentModel } from '@core/models/treatment.model';
import { FormDialogComponent } from './dialog/form-dialog/form-dialog.component';
import {DeleteComponent, DialogData, PatientDeleteSummary} from './dialog/delete/delete.component';
import { SelectionModel } from '@angular/cdk/collections';
import { startWith, take } from 'rxjs/operators';
import { Direction } from '@angular/cdk/bidi';
import {
  TableExportUtil,
  TableElement,
  UnsubscribeOnDestroyAdapter,
} from '@shared';
import {formatDate, NgClass, DatePipe, NgIf} from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { FeatherIconsComponent } from '@shared/components/feather-icons/feather-icons.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import {NotificationService} from "@core/service/notification.service";
import {Router} from "@angular/router";
import * as firestore from "firebase/firestore";
import {FirebaseAuthenticationService} from "../../../authentication/services/firebase-authentication.service";
import {User} from "@core";

@Component({
  selector: 'app-allpatients',
  templateUrl: './allpatients.component.html',
  styleUrls: ['./allpatients.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    MatTooltipModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    NgClass,
    MatCheckboxModule,
    FeatherIconsComponent,
    MatRippleModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    DatePipe,
    NgIf,
  ],
})
export class AllpatientsComponent extends UnsubscribeOnDestroyAdapter implements AfterViewInit {

  readonly defaultPageSize = 10;

  displayedColumns = [
    'select',
    //'img', // TODO: uncomment when image ticket is done
    'name',
    'gender',
    'address',
    'phoneNumber',
    //'condition',
    'actions',
  ];

  dataSource = new MatTableDataSource<Patient>([]);
  selection = new SelectionModel<Patient>(true, []);
  isLoading = false;
  private lastPageSize = this.defaultPageSize;

  constructor(
    private dialog: MatDialog,
    public patientService: PatientService,
    private notificationService: NotificationService,
    private router: Router,
    private firebaseAuthenticationService: FirebaseAuthenticationService,
  ) {
    super();
  }
  @ViewChild(MatPaginator, { static: true })
  paginator!: MatPaginator;

  ngAfterViewInit() {
    setTimeout(() => {
      this.patientService.clearPatientsPageCursors();
      this.loadData();
    });
  }
  get doctor(): User {
    return this.firebaseAuthenticationService.currentUserValue;
  }
  refresh() {
    this.patientService.clearPatientsPageCursors();
    this.selection.clear();
    if (this.paginator.pageIndex !== 0) {
      this.paginator.pageIndex = 0;
    } else {
      this.loadPage();
    }
  }
  addNew() {
    if (this.doctor.subscription.patientsCount >= this.doctor.subscription.maxPatientsLimit || this.doctor.subscription.status !== 'active') {
      this.notificationService.showSwalDialogWithFunction(
        this.doctor.subscription.status !== 'active' ?
          'Your plan is not active.' :
          'Upgrade your plan to add more patients',
        this.doctor.subscription.status !== 'active' ?
          'Check your billing portal in plans page.' :
          `You have reached the maximum number of patients for your plan (${this.doctor.subscription.maxPatientsLimit} patients). \nYou can upgrade your plan to add more patients.`,
        'error',
        true,
        'Go to plan page',
        () => {
          this.router.navigate(['/admin/doctors/doctor-plans']);
        }
      );
      return;
    }
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        patient: {} as Patient,
        action: 'add',
      },
      direction: tempDirection,
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        const newPatient: Patient = new Patient();
        newPatient.firstName = dialogRef.componentInstance.patientForm.value.firstName;
        newPatient.lastName  = dialogRef.componentInstance.patientForm.value.lastName;
        newPatient.gender = dialogRef.componentInstance.patientForm.value.gender;
        newPatient.phoneNumber = dialogRef.componentInstance.patientForm.value.phoneNumber;
        newPatient.address = dialogRef.componentInstance.patientForm.value.address;
        newPatient.condition = dialogRef.componentInstance.patientForm.value.condition;
        newPatient.birthDate = firestore.Timestamp.fromDate(dialogRef.componentInstance.patientForm.value.birthDate);
        newPatient.email = dialogRef.componentInstance.patientForm.value.email;
        newPatient.maritalState = dialogRef.componentInstance.patientForm.value.maritalState;
        newPatient.bloodGroup = dialogRef.componentInstance.patientForm.value.bloodGroup;
        newPatient.bloodPressure = dialogRef.componentInstance.patientForm.value.bloodPressure;
        newPatient.weight = dialogRef.componentInstance.patientForm.value.weight;
        newPatient.img = dialogRef.componentInstance.patientForm.value.img;
        void this.patientService.addPatient(newPatient).then(() => {
          this.patientService.clearPatientsPageCursors();
          if (this.paginator.pageIndex !== 0) {
            this.paginator.pageIndex = 0;
          } else {
            this.loadPage();
          }
        });
        this.notificationService.showSnackBarNotification(
          'snackbar-success',
          'Add Record Successfully...!!!',
          'bottom',
          'center'
        );
      }
    });
  }
  editCall(row: Patient) {
    this.patientService.dialogData = row;

    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        patient: row,
        action: 'edit',
      },
      direction: tempDirection,
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        const updatePatient: Patient = new Patient();
        updatePatient.firstName = dialogRef.componentInstance.patientForm.value.firstName;
        updatePatient.lastName  = dialogRef.componentInstance.patientForm.value.lastName;
        updatePatient.gender = dialogRef.componentInstance.patientForm.value.gender;
        updatePatient.phoneNumber = dialogRef.componentInstance.patientForm.value.phoneNumber;
        updatePatient.address = dialogRef.componentInstance.patientForm.value.address;
        updatePatient.condition = dialogRef.componentInstance.patientForm.value.condition;
        updatePatient.birthDate = firestore.Timestamp.fromDate(dialogRef.componentInstance.patientForm.value.birthDate);
        updatePatient.email = dialogRef.componentInstance.patientForm.value.email;
        updatePatient.maritalState = dialogRef.componentInstance.patientForm.value.maritalState;
        updatePatient.bloodGroup = dialogRef.componentInstance.patientForm.value.bloodGroup;
        updatePatient.bloodPressure = dialogRef.componentInstance.patientForm.value.bloodPressure;
        updatePatient.weight = dialogRef.componentInstance.patientForm.value.weight;
        updatePatient.img = dialogRef.componentInstance.patientForm.value.img;
        this.patientService.updatePatient(updatePatient);
        this.loadPage();
        this.notificationService.showSnackBarNotification(
          'black',
          'Edit Record Successfully...!!!',
          'bottom',
          'center'
        );
      }
    });
  }
  deleteItem(row: Patient) {
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(DeleteComponent, {
      data: {
        id: row.id,
        gender: row.gender,
        phoneNumber: row.phoneNumber,
        bloodGroup: row.bloodGroup,
        name: row.firstName + ' ' + row.lastName,
      } as DialogData,
      direction: tempDirection,
    });

    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        void this.patientService.deletePatient(row.id).then(() => {
          this.patientService.clearPatientsPageCursors();
          this.loadPage();
        });
        this.notificationService.showSnackBarNotification(
          'snackbar-danger',
          'Delete Record Successfully...!!!',
          'bottom',
          'center'
        );
      }
    });
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows && numRows > 0;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.data.forEach((row) =>
        this.selection.select(row)
      );
  }
  removeSelectedRows() {
    if (!this.selection.hasValue()) {
      return;
    }

    const selectedPatients: PatientDeleteSummary[] = this.selection.selected.map((row) => ({
      id: row.id,
      gender: row.gender,
      phoneNumber: row.phoneNumber,
      bloodGroup: row.bloodGroup,
      name: row.firstName + ' ' + row.lastName,
    }));

    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }

    const dialogRef = this.dialog.open(DeleteComponent, {
      data: {
        patients: selectedPatients,
      } as DialogData,
      direction: tempDirection,
    });

    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        const totalSelect = selectedPatients.length;
        const deletePromises = selectedPatients.map((item) =>
          this.patientService.deletePatient(item.id)
        );

        void Promise.all(deletePromises).then(() => {
          this.patientService.clearPatientsPageCursors();
          this.selection.clear();
          this.loadPage();
        });

        this.notificationService.showSnackBarNotification(
          'snackbar-danger',
          totalSelect + ' Record Delete Successfully...!!!',
          'bottom',
          'center'
        );
      }
    });
  }

  public loadData() {
    this.lastPageSize = this.getEffectivePageSize();
    this.subs.sink = this.paginator.page.pipe(startWith(null)).subscribe(() => {
      if (this.paginator.pageSize !== this.lastPageSize) {
        this.patientService.clearPatientsPageCursors();
        this.paginator.pageIndex = 0;
        this.lastPageSize = this.getEffectivePageSize();
      }
      this.selection.clear();
      this.loadPage();
    });
  }

  private getEffectivePageSize(): number {
    const pageSize = this.paginator?.pageSize;
    return pageSize && pageSize > 0 ? pageSize : this.defaultPageSize;
  }

  private loadPage() {
    this.isLoading = true;
    const pageSize = this.getEffectivePageSize();
    this.subs.sink = this.patientService
      .getPatientsPage(
        this.paginator.pageIndex,
        pageSize
      )
      .pipe(take(1))
      .subscribe({
        next: (result) => {
          this.dataSource.data = result.patients;
          this.isLoading = false;
        },
        error: (error) => {
          this.isLoading = false;
          console.log('error: ' + JSON.stringify(error));
        },
      });
  }

  private formatTimestamp(value?: firestore.Timestamp, format = 'yyyy-MM-dd'): string {
    if (!value || !value.toDate) {
      return '';
    }
    return formatDate(value.toDate(), format, 'en');
  }

  private formatTime(value?: firestore.Timestamp): string {
    if (!value || !value.toDate) {
      return '';
    }
    return formatDate(value.toDate(), 'HH:mm', 'en');
  }

  private formatValue(value?: string | number): string {
    if (value === null || value === undefined) {
      return '-';
    }
    const text = String(value).trim();
    return text.length ? text : '-';
  }

  private formatAppointment(appointment: AppointmentModel): string {
    const date = this.formatTimestamp(appointment.date);
    const time = this.formatTime(appointment.time);
    const dateTime = [date, time].filter(Boolean).join(' ');
    const costValue = appointment.cost ?? 0;
    const costPaid = appointment.costPaid ? 'Paid' : 'Unpaid';
    const attended = appointment.attended ? 'Attended' : 'Not Attended';
    const note = this.formatValue(appointment.details);
    return [
      `Date: ${dateTime || '-'}`,
      `Status: Cost ${costValue}, ${costPaid}, ${attended}`,
      `Note: ${note}`,
    ].join('\n');
  }

  private formatAppointments(appointments: AppointmentModel[]): string {
    if (!appointments.length) {
      return '';
    }
    return appointments
      .map((appointment) => this.formatAppointment(appointment))
      .join('\n-------------------\n');
  }

  private formatPayment(payment: PaymentModel): string {
    const date = this.formatTimestamp(payment.date);
    const amount = payment.amount ?? 0;
    const details = this.formatValue(payment.details);
    return [
      `Date: ${date || '-'}`,
      `Amount: ${amount}`,
      `Details: ${details}`,
    ].join('\n');
  }

  private formatPayments(payments: PaymentModel[]): string {
    if (!payments.length) {
      return '';
    }
    return payments
      .map((payment) => this.formatPayment(payment))
      .join('\n-------------------\n');
  }

  private formatTreatment(treatment: TreatmentModel): string {
    const date = this.formatTimestamp(treatment.date);
    const price = treatment.price ?? 0;
    const discount = treatment.discount ?? 0;
    const details = this.formatValue(treatment.details);
    return [
      `Date: ${date || '-'}`,
      `Price: ${price}`,
      `Discount: ${discount}`,
      `Details: ${details}`,
    ].join('\n');
  }

  private formatTreatments(treatments: TreatmentModel[]): string {
    if (!treatments.length) {
      return '';
    }
    return treatments
      .map((treatment) => this.formatTreatment(treatment))
      .join('\n-------------------\n');
  }

  private buildPatientExportRows(
    patients: Patient[],
    appointmentsByPatientId: Record<string, AppointmentModel[]>,
    paymentsByPatientId: Record<string, PaymentModel[]>,
    treatmentsByPatientId: Record<string, TreatmentModel[]>
  ): Partial<TableElement>[] {
    return patients.map((patient) => ({
      'Full Name': this.formatValue(`${patient.firstName} ${patient.lastName}`.replace(/\s+/g, ' ').trim()),
      Gender: this.formatValue(patient.gender),
      'Birth Date': this.formatValue(this.formatTimestamp(patient.birthDate)),
      'Blood Group': this.formatValue(patient.bloodGroup),
      'Blood Pressure': this.formatValue(patient.bloodPressure),
      'Weight (kg)': this.formatValue(patient.weight),
      'Phone Number': this.formatValue(patient.phoneNumber),
      Email: this.formatValue(patient.email),
      'Marital State': this.formatValue(patient.maritalState),
      Address: this.formatValue(patient.address),
      Treatment: this.formatValue(patient.condition),
      'Created At': this.formatValue(this.formatTimestamp(patient.createdAt, 'yyyy-MM-dd HH:mm')),
      Notes: this.formatValue(patient.notes),
      Appointments: this.formatAppointments(appointmentsByPatientId[patient.id] ?? []),
      Payments: this.formatPayments(paymentsByPatientId[patient.id] ?? []),
      Treatments: this.formatTreatments(treatmentsByPatientId[patient.id] ?? []),
    }));
  }

  private async exportPatientsWithAppointments(
    patients: Patient[],
    fileName: string
  ): Promise<void> {
    const patientIds = patients.map((patient) => patient.id);
    const [appointmentsByPatientId, paymentsByPatientId, treatmentsByPatientId] = await Promise.all([
      this.patientService.getAppointmentsByPatientIds(patientIds),
      this.patientService.getPaymentsByPatientIds(patientIds),
      this.patientService.getTreatmentsByPatientIds(patientIds),
    ]);
    const exportData = this.buildPatientExportRows(
      patients,
      appointmentsByPatientId,
      paymentsByPatientId,
      treatmentsByPatientId
    );
    TableExportUtil.exportToExcel(exportData, fileName);
  }

  exportSelectedPatients() {
    void this.exportPatientsWithAppointments(this.selection.selected, 'patients-selected');
  }

  exportAllPatients() {
    void this.patientService.getAllPatientsForExport().then((patients) =>
      this.exportPatientsWithAppointments(patients, 'patients-all')
    );
  }

  goToProfilePage(row: Patient) {
    this.patientService.dialogData = row;
    this.router.navigate(['/admin/patients/patient-profile']);
  }

}
