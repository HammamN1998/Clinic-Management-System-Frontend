import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PatientService } from '@core/service/patient.service';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { Patient } from '@core/models/patient.model';
import { AppointmentModel } from '@core/models/appointment.model';
import { DataSource } from '@angular/cdk/collections';
import { FormDialogComponent } from './dialog/form-dialog/form-dialog.component';
import {DeleteComponent, DialogData} from './dialog/delete/delete.component';
import { BehaviorSubject, fromEvent, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SelectionModel } from '@angular/cdk/collections';
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
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import {NotificationService} from "@core/service/notification.service";
import {Router} from "@angular/router";
import * as firestore from "firebase/firestore";
import {FirebaseAuthenticationService} from "../../../authentication/services/firebase-authentication.service";
import {Role, User} from "@core";

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
    MatSortModule,
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
export class AllpatientsComponent extends UnsubscribeOnDestroyAdapter implements OnInit {

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

  dataSource!: ExampleDataSource;
  selection = new SelectionModel<Patient>(true, []);
  index?: number;

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
  @ViewChild(MatSort, { static: true })
  sort!: MatSort;
  @ViewChild('filter', { static: true }) filter?: ElementRef;
  ngOnInit() {
    this.loadData();
  }
  get doctor(): User {
    return this.firebaseAuthenticationService.currentUserValue;
  }
  refresh() {
    this.loadData();
  }
  addNew() {
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
        // Add patient to Firestore and local storage
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
        newPatient.img = dialogRef.componentInstance.patientForm.value.img;
        this.patientService.addPatient(newPatient);
        this.refreshTable();
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
        // Edit patient on Firestore and local storage
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
        updatePatient.img = dialogRef.componentInstance.patientForm.value.img;
        this.patientService.updatePatient(updatePatient);
        // And lastly refresh table
        this.refreshTable();
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

        // Delete patient from Firestore and local storage
        this.patientService.deletePatient(row.id);

        this.refreshTable();
        this.notificationService.showSnackBarNotification(
          'snackbar-danger',
          'Delete Record Successfully...!!!',
          'bottom',
          'center'
        );
      }
    });
  }
  private refreshTable() {
    this.paginator._changePageSize(this.paginator.pageSize);
  }
  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.renderedData.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.renderedData.forEach((row) =>
        this.selection.select(row)
      );
  }
  removeSelectedRows() {
    const totalSelect = this.selection.selected.length;
    this.selection.selected.forEach((item) => {

      // Delete the patient from Firestore and local storage.
      this.patientService.deletePatient(item.id);

    });

    this.refreshTable();
    this.selection = new SelectionModel<Patient>(true, []);

    this.notificationService.showSnackBarNotification(
      'snackbar-danger',
      totalSelect + ' Record Delete Successfully...!!!',
      'bottom',
      'center'
    );
  }
  public loadData() {
    //this.patientService = new PatientService(this.dateService, this.firebaseAuthenticationService, this.firestore);
    this.dataSource = new ExampleDataSource(
      this.patientService,
      this.paginator,
      this.sort
    );
    this.subs.sink = fromEvent(this.filter?.nativeElement, 'keyup').subscribe(
      () => {
        if (!this.dataSource) {
          return;
        }
        this.dataSource.filter = this.filter?.nativeElement.value;
      }
    );
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

  private buildPatientExportRows(
    patients: Patient[],
    appointmentsByPatientId: Record<string, AppointmentModel[]>
  ): Partial<TableElement>[] {
    return patients.map((patient) => ({
      'Full Name': this.formatValue(`${patient.firstName} ${patient.lastName}`.replace(/\s+/g, ' ').trim()),
      Gender: this.formatValue(patient.gender),
      'Birth Date': this.formatValue(this.formatTimestamp(patient.birthDate)),
      'Blood Group': this.formatValue(patient.bloodGroup),
      'Blood Pressure': this.formatValue(patient.bloodPressure),
      'Phone Number': this.formatValue(patient.phoneNumber),
      Email: this.formatValue(patient.email),
      'Marital State': this.formatValue(patient.maritalState),
      Address: this.formatValue(patient.address),
      Treatment: this.formatValue(patient.condition),
      'Created At': this.formatValue(this.formatTimestamp(patient.createdAt, 'yyyy-MM-dd HH:mm')),
      Notes: this.formatValue(patient.notes),
      Appointments: this.formatAppointments(appointmentsByPatientId[patient.id] ?? []),
    }));
  }

  private async exportPatientsWithAppointments(
    patients: Patient[],
    fileName: string
  ): Promise<void> {
    const appointmentsByPatientId = await this.patientService.getAppointmentsByPatientIds(
      patients.map((patient) => patient.id)
    );
    const exportData = this.buildPatientExportRows(patients, appointmentsByPatientId);
    TableExportUtil.exportToExcel(exportData, fileName);
  }

  exportSelectedPatients() {
    void this.exportPatientsWithAppointments(this.selection.selected, 'patients-selected');
  }

  exportAllPatients() {
    void this.exportPatientsWithAppointments(this.patientService.data, 'patients-all');
  }

  goToProfilePage(row: Patient) {
    this.patientService.dialogData = row;
    this.router.navigate(['/admin/patients/patient-profile']);
  }

  protected readonly Role = Role;
}
export class ExampleDataSource extends DataSource<Patient> {
  filterChange = new BehaviorSubject('');
  get filter(): string {
    return this.filterChange.value;
  }
  set filter(filter: string) {
    this.filterChange.next(filter);
  }
  filteredData: Patient[] = [];
  renderedData: Patient[] = [];
  constructor(
    public patientService: PatientService,
    public paginator: MatPaginator,
    public _sort: MatSort
  ) {
    super();
    // Reset to the first page when the user changes the filter.
    this.filterChange.subscribe(() => (this.paginator.pageIndex = 0));
  }
  /** Connect function called by the table to retrieve one stream containing the data to render. */
  connect(): Observable<Patient[]> {
    // Listen for any changes in the base data, sorting, filtering, or pagination
    const displayDataChanges = [
      this.patientService.dataChange,
      this._sort.sortChange,
      this.filterChange,
      this.paginator.page,
    ];
    this.patientService.getAllPatients();
    return merge(...displayDataChanges).pipe(
      map(() => {
        // Filter data
        this.filteredData = this.patientService.data
          .slice()
          .filter((patient: Patient) => {
            const searchStr = (
              patient.firstName +
              patient.lastName +
              patient.address +
              patient.birthDate +
              patient.bloodGroup +
              patient.condition +
              patient.phoneNumber
            ).toLowerCase();
            return searchStr.indexOf(this.filter.toLowerCase()) !== -1;
          });
        // Sort filtered data
        const sortedData = this.sortData(this.filteredData.slice());
        // Grab the page's slice of the filtered sorted data.
        const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
        this.renderedData = sortedData.splice(
          startIndex,
          this.paginator.pageSize
        );
        return this.renderedData;
      })
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect() { }
  /** Returns a sorted copy of the database data. */
  sortData(data: Patient[]): Patient[] {
    if (!this._sort.active || this._sort.direction === '') {
      return data;
    }
    return data.sort((a, b) => {
      let propertyA: number | string = '';
      let propertyB: number | string = '';
      switch (this._sort.active) {
        case 'id':
          [propertyA, propertyB] = [a.id, b.id];
          break;
        case 'name':
          [propertyA, propertyB] = [a.firstName, b.firstName];
          break;
        case 'gender':
          [propertyA, propertyB] = [a.gender, b.gender];
          break;
        case 'date':
          [propertyA, propertyB] = [a.birthDate.toDate().toLocaleDateString(), b.birthDate.toDate().toLocaleDateString()];
          break;
        case 'address':
          [propertyA, propertyB] = [a.address, b.address];
          break;
        case 'phoneNumber':
          [propertyA, propertyB] = [a.phoneNumber, b.phoneNumber];
          break;
      }
      const valueA = isNaN(+propertyA) ? propertyA : +propertyA;
      const valueB = isNaN(+propertyB) ? propertyB : +propertyB;
      return (
        (valueA < valueB ? -1 : 1) * (this._sort.direction === 'asc' ? 1 : -1)
      );
    });
  }
}
