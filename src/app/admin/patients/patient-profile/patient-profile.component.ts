import { Component } from '@angular/core';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import {PatientService} from "@core/service/patient.service";
import {Patient} from "@core/models/patient.model";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatTabsModule} from "@angular/material/tabs";
import {Router} from "@angular/router";
import {MatDialog} from "@angular/material/dialog";
import {DeleteComponent, DialogData} from "../allpatients/dialog/delete/delete.component";
import {Direction} from "@angular/cdk/bidi";
import {NotificationService} from "@core/service/notification.service";
import {SharedModule, UnsubscribeOnDestroyAdapter} from "@shared";
import {MatDatepickerModule} from "@angular/material/datepicker";
import { OwlDateTimeModule, OwlNativeDateTimeModule } from '@danielmoncada/angular-datetime-picker';
import {ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators} from "@angular/forms";
import {AppointmentModel} from "@core/models/appointment.model";
import {from} from "rxjs";
import {MatSlideToggleChange} from "@angular/material/slide-toggle";
import {AdultTeethDiagramComponent} from "@shared/components/dentist/adult-teeth-diagram/adult-teeth-diagram.component";
import * as firestore from 'firebase/firestore';

@Component({
  selector: 'app-patient-profile',
  templateUrl: './patient-profile.component.html',
  styleUrls: ['./patient-profile.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, MatTabsModule, MatDatepickerModule, OwlDateTimeModule, OwlNativeDateTimeModule, ReactiveFormsModule, SharedModule, AdultTeethDiagramComponent,],
})
export class PatientProfileComponent extends UnsubscribeOnDestroyAdapter{
  patient!: Patient;


  appointmentForm: UntypedFormGroup;
  patientAppointments: AppointmentModel[] = [];

  constructor(
    private patientService: PatientService,
    private router: Router,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private formBuilder: UntypedFormBuilder,
  ) {
    super();
    // constructor code
    this.patient = this.patientService.getDialogData();
    this.appointmentForm = this.createAppointmentForm();

    this.getPatientAppointments();
  }


  goToEditPage() {
    this.patientService.dialogData = this.patient;
    this.router.navigate(['/admin/patients/edit-patient']);
  }

  deletePatient() {
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(DeleteComponent, {
      data: {
        id: this.patient.id,
        gender: this.patient.gender,
        phoneNumber: this.patient.phoneNumber,
        bloodGroup: this.patient.bloodGroup,
        name: this.patient.firstName + ' ' + this.patient.lastName,
      } as DialogData,
      direction: tempDirection,
    });

    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {

        // Delete patient from Firestore and local storage
        this.patientService.deletePatient(this.patient.id);
        this.router.navigate(['/admin/patients/all-patients']);
        this.notificationService.showNotification(
          'snackbar-danger',
          'Delete Record Successfully...!!!',
          'bottom',
          'center'
        );
      }
    });

  }

  addAppointment() {
    const newAppointment = new AppointmentModel();
    newAppointment.date = firestore.Timestamp.fromDate(this.appointmentForm.get('date')?.value);
    newAppointment.time = firestore.Timestamp.fromDate(this.appointmentForm.get('time')?.value);
    newAppointment.details = this.appointmentForm.get('details')?.value;
    newAppointment.attended = this.appointmentForm.get('attended')?.value;
    newAppointment.cost = this.appointmentForm.get('cost')?.value;
    newAppointment.costPaid = this.appointmentForm.get('costPaid')?.value;

    from(this.patientService.addPatientAppointment(newAppointment))
    .subscribe({
      next: () => {
        this.appointmentForm = this.createAppointmentForm();
        this.notificationService.showNotification(
          'snackbar-success',
          'Add Appointment Successfully...!!!',
          'bottom',
          'center'
        );
        this.getPatientAppointments();
      },
      error: (error) => {
        console.log('error: ' + error)
      }
    })
  }

  getPatientAppointments() {
    this.patientAppointments = [];
    from(this.patientService.getPatientAppointments())
    .subscribe({
      next: (appointments) => {
        appointments.docs.map((appointment) => {
          this.patientAppointments.push(appointment.data() as AppointmentModel);
        })
      }
    });
  }

  private createAppointmentForm(): UntypedFormGroup {
    return this.formBuilder.group({
      date: ['', [Validators.required]],
      time: ['', [Validators.required]],
      details: [''],
      cost: [0, [Validators.min(0), Validators.max(1000)]],
      costPaid: [true],
      attended: [false]
    })
  }

  changeAppointmentAttended($event: MatSlideToggleChange, appointment: AppointmentModel) {
    this.patientService.changeAppointmentAttended(appointment, $event.checked ? 'true': 'false');
  }

  deleteAppointment(appointment: AppointmentModel) {
    from(this.patientService.deleteAppointment(appointment.id))
      .subscribe({
        next: () => {
          this.getPatientAppointments();
        },
        error: (error) => {
          console.log('error: ' + error);
        }
      })
  }
}
