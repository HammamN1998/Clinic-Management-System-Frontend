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
    return this.fb.group({
      // Required Fields
      firstName: [ '', [Validators.required, Validators.pattern('[a-zA-Z]+')], ],
      gender: ['', [Validators.required]],
      phoneNumber: ['', [Validators.required]],
      address: ['Palestine-', [Validators.required]],
      condition: ['', [Validators.required]],
      // Not required Fields
      id: [''],
      lastName: [''],
      maritalState: [''],
      email: [ '', [Validators.email, Validators.minLength(5)], ],
      bloodGroup: [''],
      bloodPressure: [''],
      birthDate: [''],
      uploadFile: [''],
      doctorId: [''],
    });
  }

  onSubmit() {
    const patientData : Patient = {
      firstName: this.patientForm.value.firstName.toString(),
      lastName: this.patientForm.value.lastName.toString(),
      gender: this.patientForm.value.gender.toString(),
      phoneNumber: this.patientForm.value.phoneNumber.toString(),
      birthDate: this.patientForm.value.birthDate.toString(),
      email: this.patientForm.value.email.toString(),
      maritalState: this.patientForm.value.maritalState.toString(),
      address: this.patientForm.value.address.toString(),
      bloodGroup: this.patientForm.value.bloodGroup.toString(),
      bloodPressure: this.patientForm.value.bloodPressure.toString(),
      condition: this.patientForm.value.condition.toString(),
      img: 'assets/images/user/user1.jpg', // Or any other image URL
    } as Patient;

    this.patientService.addPatient(patientData)
    this.notificationService.showNotification(
      'snackbar-success',
      'Add Record Successfully...!!!',
      'bottom',
      'center'
    )
    this.patientForm = this.createContactForm();
  }
}
