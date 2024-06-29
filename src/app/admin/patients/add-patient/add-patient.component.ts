import { Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { FileUploadComponent } from '@shared/components/file-upload/file-upload.component';
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
    FileUploadComponent,
    MatButtonModule,
    NgIf,
  ],
})
export class AddPatientComponent {
  patientForm: UntypedFormGroup;
  constructor(
    private fb: UntypedFormBuilder,
    private patientService: PatientService,
    private notificationService: NotificationService,
  ) {
    this.patientForm = this.createContactForm();
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
      birthDate: [newPatient.birthDate.toDate()],
      uploadFile: [newPatient.img],
      doctorId: [newPatient.doctorId],
    });
  }

  onSubmit() {
    const newPatient: Patient = new Patient();
    newPatient.firstName = this.patientForm.value.firstName.toString();
    newPatient.lastName = this.patientForm.value.lastName.toString();
    newPatient.gender = this.patientForm.value.gender.toString();
    newPatient.phoneNumber = this.patientForm.value.phoneNumber.toString();
    newPatient.birthDate = firestore.Timestamp.fromDate(this.patientForm.value.birthDate);
    newPatient.email = this.patientForm.value.email.toString();
    newPatient.maritalState = this.patientForm.value.maritalState.toString();
    newPatient.address = this.patientForm.value.address.toString();
    newPatient.bloodGroup = this.patientForm.value.bloodGroup.toString();
    newPatient.bloodPressure = this.patientForm.value.bloodPressure.toString();
    newPatient.condition = this.patientForm.value.condition.toString();
    newPatient.img = '';

    this.patientService.addPatient(newPatient)
    this.notificationService.showNotification(
      'snackbar-success',
      'Add Record Successfully...!!!',
      'bottom',
      'center'
    )
    this.patientForm = this.createContactForm();
  }
}
