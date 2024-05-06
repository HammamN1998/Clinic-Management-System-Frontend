import {Component} from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { FileUploadComponent } from '@shared/components/file-upload/file-upload.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { PatientService } from "@core/service/patient.service";
import {NgIf} from "@angular/common";
import {Patient} from "@core/models/patient.model";
import {NotificationService} from "@core/service/notification.service";
import {Router} from "@angular/router";
import * as firestore from "firebase/firestore";

@Component({
  selector: 'app-edit-patient',
  templateUrl: './edit-patient.component.html',
  styleUrls: ['./edit-patient.component.scss'],
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
export class EditPatientComponent {
  patientForm: UntypedFormGroup;
  constructor(
    private fb: UntypedFormBuilder,
    private patientService: PatientService,
    private notificationService: NotificationService,
    private router: Router,
  ) {
    this.patientForm = this.createContactForm();
  }

  createContactForm(): UntypedFormGroup {
    return this.fb.group({
      // Required Fields
      firstName: [
        this.patientService.getDialogData().firstName,
        [Validators.required, Validators.pattern('[a-zA-Z]+')],
      ],
      gender: [this.patientService.getDialogData().gender, [Validators.required]],
      phoneNumber: [this.patientService.getDialogData().phoneNumber, [Validators.required]],
      address: [this.patientService.getDialogData().address, [Validators.required]],
      condition: [this.patientService.getDialogData().condition, [Validators.required]],
      // Not required Fields
      lastName: [this.patientService.getDialogData().lastName],
      maritalState: [this.patientService.getDialogData().maritalState],
      email: [
        this.patientService.getDialogData().email,
        [Validators.email, Validators.minLength(5)],
      ],
      bloodGroup: [this.patientService.getDialogData().bloodGroup],
      bloodPressure: [this.patientService.getDialogData().bloodPressure],
      birthDate: [this.patientService.getDialogData().birthDate.toDate()],
      uploadFile: [this.patientService.getDialogData().img],
    });
  }

  onSubmit() {
    const updatePatient: Patient = new Patient();
    updatePatient.firstName = this.patientForm.value.firstName.toString();
    updatePatient.lastName = this.patientForm.value.lastName.toString();
    updatePatient.gender = this.patientForm.value.gender.toString();
    updatePatient.phoneNumber = this.patientForm.value.phoneNumber.toString();
    updatePatient.birthDate = firestore.Timestamp.fromDate(this.patientForm.value.birthDate);
    updatePatient.email = this.patientForm.value.email.toString();
    updatePatient.maritalState = this.patientForm.value.maritalState.toString();
    updatePatient.address = this.patientForm.value.address.toString();
    updatePatient.bloodGroup = this.patientForm.value.bloodGroup.toString();
    updatePatient.bloodPressure = this.patientForm.value.bloodPressure.toString();
    updatePatient.condition = this.patientForm.value.condition.toString();
    updatePatient.img = this.patientForm.value.uploadFile.toString();

    this.patientService.updatePatient(updatePatient);
    this.router.navigate(['/admin/patients/patient-profile']);
    this.notificationService.showNotification(
      'black',
      'Edit Record Successfully...!!!',
      'bottom',
      'center'
    )
  }
}
