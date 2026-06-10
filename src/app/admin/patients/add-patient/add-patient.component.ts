import { Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { PatientService } from '@core/service/patient.service';
import {Patient} from "@core/models/patient.model";
import {NgIf} from "@angular/common";
import {NotificationService} from "@core/service/notification.service";
import * as firestore from 'firebase/firestore';
import { User } from '@core/models/user';
import {Router} from "@angular/router";
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-add-patient',
  templateUrl: './add-patient.component.html',
  styleUrls: ['./add-patient.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatDatepickerModule,
    MatButtonModule,
    NgIf,
    TranslateModule,
  ],
})
export class AddPatientComponent {
  patientForm: UntypedFormGroup;
  constructor(
    private fb: UntypedFormBuilder,
    private patientService: PatientService,
    private notificationService: NotificationService,
    private router: Router,
    private translate: TranslateService,
  ) {
    this.patientForm = this.createContactForm();
  }

  get doctor(): User {
    return this.patientService.doctor;
  }

  createContactForm(): UntypedFormGroup {
    const newPatient: Patient = new Patient();
    return this.fb.group({
      // Required Fields
      firstName: [ newPatient.firstName, [Validators.required], ],
      gender: [newPatient.gender, [Validators.required]],
      phoneNumber: [newPatient.phoneNumber, [Validators.required]],
      address: [newPatient.address, [Validators.required]],
      // Not required Fields
      condition: [newPatient.condition],
      id: [newPatient.id],
      lastName: [newPatient.lastName],
      maritalState: [newPatient.maritalState],
      email: [ newPatient.email, [Validators.email, Validators.minLength(5)], ],
      bloodGroup: [newPatient.bloodGroup],
      bloodPressure: [newPatient.bloodPressure],
      weight: [newPatient.weight],
      birthDate: [newPatient.birthDate.toDate()],
      uploadFile: [newPatient.img],
      doctorId: [newPatient.doctorId],
    });
  }

  onSubmit() {
    if (this.doctor.subscription.patientsCount >= this.doctor.subscription.maxPatientsLimit || this.doctor.subscription.status !== 'active') {
      const isInactive = this.doctor.subscription.status !== 'active';
      this.notificationService.showSwalDialogWithFunction(
        this.translate.instant(isInactive ? 'PATIENTS.MESSAGES.PLAN_INACTIVE_TITLE' : 'PATIENTS.MESSAGES.UPGRADE_TITLE'),
        isInactive
          ? this.translate.instant('PATIENTS.MESSAGES.PLAN_INACTIVE_BODY')
          : this.translate.instant('PATIENTS.MESSAGES.UPGRADE_BODY', { count: this.doctor.subscription.maxPatientsLimit }),
        'error',
        true,
        this.translate.instant('PATIENTS.MESSAGES.GO_TO_PLAN'),
        () => {
          this.router.navigate(['/admin/doctors/doctor-plans']);
        }
      );
      return;
    }
    void this.patientService.checkBeforeAdd(this.patientForm.value.phoneNumber, () =>
      this.saveNewPatient()
    );
  }

  private saveNewPatient() {
    const newPatient: Patient = new Patient();
    newPatient.firstName = this.patientForm.value.firstName.toString();
    newPatient.lastName = this.patientForm.value.lastName.toString();
    newPatient.gender = this.patientForm.value.gender.toString();
    newPatient.phoneNumber = String(this.patientForm.value.phoneNumber ?? '').trim();
    newPatient.birthDate = firestore.Timestamp.fromDate(this.patientForm.value.birthDate);
    newPatient.email = this.patientForm.value.email.toString();
    newPatient.maritalState = this.patientForm.value.maritalState.toString();
    newPatient.address = this.patientForm.value.address.toString();
    newPatient.bloodGroup = this.patientForm.value.bloodGroup.toString();
    newPatient.bloodPressure = this.patientForm.value.bloodPressure.toString();
    newPatient.weight = this.patientForm.value.weight.toString();
    newPatient.condition = this.patientForm.value.condition.toString();
    newPatient.img = '';

    this.patientService.addPatient(newPatient)
    this.notificationService.showSnackBarNotification(
      'snackbar-success',
      this.translate.instant('PATIENTS.MESSAGES.ADD_SUCCESS'),
      'bottom',
      'center'
    )
    this.patientForm = this.createContactForm();
  }
}
