import { Component, OnInit, ViewChild } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { FormControl, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { from } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import * as firestore from 'firebase/firestore';
import { AppointmentModel } from '@core/models/appointment.model';
import { Patient } from '@core/models/patient.model';
import { NumericInputDirective } from '@core/directive/numeric-input.directive';
import { NotificationService } from '@core/service/notification.service';
import { PatientService } from '@core/service/patient.service';
import { buildTimeSlots, compareTimeSlots, nextTimeSlot, toAmount } from '@core/util/appointment-form.util';
import { matchesPatientSearch } from '@core/util/patient-search.util';
import { UnsubscribeOnDestroyAdapter } from '@shared';

export interface NewAppointmentDialogResult {
  created: boolean;
  patient: Patient;
}

const RESULT_LIMIT = 50;

@Component({
  selector: 'app-new-appointment-dialog',
  templateUrl: './new-appointment-dialog.component.html',
  styleUrls: ['./new-appointment-dialog.component.scss'],
  standalone: true,
  imports: [
    A11yModule,
    TextFieldModule,
    NgIf,
    NgFor,
    ReactiveFormsModule,
    MatDialogModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSlideToggleModule,
    MatIconModule,
    MatButtonModule,
    TranslateModule,
    NumericInputDirective,
  ],
})
export class NewAppointmentDialogComponent extends UnsubscribeOnDestroyAdapter implements OnInit {
  @ViewChild('stepper') stepper?: MatStepper;

  readonly timeSlots = buildTimeSlots();
  readonly compareTimeSlots = compareTimeSlots;
  readonly searchControl = new FormControl('', { nonNullable: true });

  appointmentForm: UntypedFormGroup;
  patients: Patient[] = [];
  visiblePatients: Patient[] = [];
  selectedPatient: Patient | null = null;
  patientStepCompleted = false;
  isLoading = true;
  isSaving = false;
  hasSearched = false;

  constructor(
    private dialogRef: MatDialogRef<NewAppointmentDialogComponent, NewAppointmentDialogResult | undefined>,
    private patientService: PatientService,
    private notificationService: NotificationService,
    private translate: TranslateService,
    private router: Router,
    formBuilder: UntypedFormBuilder,
  ) {
    super();
    const now = new Date();
    this.appointmentForm = formBuilder.group({
      date: [now, [Validators.required]],
      time: [nextTimeSlot(this.timeSlots), [Validators.required]],
      details: [''],
      cost: ['', [Validators.min(0)]],
      costPaid: [true],
    });
  }

  ngOnInit(): void {
    this.subs.sink = this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe((term) => {
      this.applySearch(term);
    });
    void this.patientService.getAllPatientsForExport()
      .then((patients) => {
        this.patients = patients;
        this.isLoading = false;
        this.applySearch(this.searchControl.value);
      })
      .catch((error) => {
        this.isLoading = false;
        console.log('error: ' + JSON.stringify(error));
      });
  }

  selectPatient(patient: Patient): void {
    this.selectedPatient = patient;
    this.patientStepCompleted = true;
    setTimeout(() => this.stepper?.next());
  }

  clearSelectedPatient(): void {
    this.patientStepCompleted = false;
    this.stepper?.previous();
  }

  createAppointment(): void {
    if (!this.selectedPatient || this.appointmentForm.invalid || this.isSaving) {
      return;
    }
    const patient = this.selectedPatient;
    const appointment = new AppointmentModel();
    appointment.date = firestore.Timestamp.fromDate(this.appointmentForm.get('date')?.value);
    appointment.time = firestore.Timestamp.fromDate(this.appointmentForm.get('time')?.value);
    appointment.details = this.appointmentForm.get('details')?.value ?? '';
    appointment.cost = toAmount(this.appointmentForm.get('cost')?.value);
    appointment.costPaid = !!this.appointmentForm.get('costPaid')?.value;

    this.isSaving = true;
    this.subs.sink = from(this.patientService.addPatientAppointment(appointment, patient)).subscribe({
      next: () => {
        this.notificationService.showSnackBarNotification(
          'snackbar-success',
          this.translate.instant('PATIENTS.PROFILE.MESSAGES.ADD_APPOINTMENT_SUCCESS'),
          'bottom',
          'center',
        );
        this.dialogRef.close({ created: true, patient });
      },
      error: (error) => {
        this.isSaving = false;
        console.log('error: ' + error);
        this.notificationService.showSnackBarNotification(
          'snackbar-danger',
          this.translate.instant('CALENDAR.NEW_APPOINTMENT.SAVE_ERROR'),
          'bottom',
          'center',
        );
      },
    });
  }

  goToPatientProfile(): void {
    if (!this.selectedPatient) {
      return;
    }
    this.patientService.dialogData = this.selectedPatient;
    this.dialogRef.close();
    void this.router.navigate(['/admin/patients/patient-profile'], {
      state: { openSection: 'appointments' },
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  private applySearch(term: string): void {
    const normalized = term.trim();
    this.hasSearched = normalized.length > 0;
    if (!this.hasSearched) {
      this.visiblePatients = [];
      return;
    }
    this.visiblePatients = this.patients
      .filter((patient) => matchesPatientSearch(patient, normalized))
      .slice(0, RESULT_LIMIT);
  }
}
