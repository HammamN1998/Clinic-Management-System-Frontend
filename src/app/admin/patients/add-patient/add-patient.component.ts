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
import {PatientService} from "@core/service/patient.service";
import {Patient} from "@core/models/patient.model";

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
  ],
})
export class AddPatientComponent {
  patientForm: UntypedFormGroup;
  constructor(
    private fb: UntypedFormBuilder,
    private patientService: PatientService,
  ) {
    this.patientForm = this.fb.group({
      first: ['', [Validators.required, Validators.pattern('[a-zA-Z]+')]],
      last: [''],
      gender: ['', [Validators.required]],
      mobile: ['', [Validators.required]],
      dob: ['', [Validators.required]],
      age: [''],
      email: ['', [Validators.email, Validators.minLength(5)] ],
      maritalStatus: [''],
      address: [''],
      bGroup: [''],
      bPresure: [''],
      sugger: [''],
      injury: [''],
      uploadFile: [''],
    });
  }

  onSubmit() {
    console.log('Patient Form: ', this.patientForm.value);
    const patientData : Patient = {
      id: 123,
      name: this.patientForm.value.first.toString() + " " + this.patientForm.value.last.toString(),
      gender: this.patientForm.value.gender.toString(),
      phoneNumber: this.patientForm.value.mobile.toString(),
      birthDate: this.patientForm.value.dob.toString(),
      email: this.patientForm.value.email.toString(),
      maritalState: this.patientForm.value.maritalStatus.toString(),
      address: this.patientForm.value.address.toString(),
      bloodGroup: this.patientForm.value.bGroup.toString(),
      bloodPressure: this.patientForm.value.bPresure.toString(),
      condition: this.patientForm.value.injury.toString(),
      imgUrl: 'assets/images/user/profile.png', // Or any other image URL
      doctorId: ''
    };

    this.patientService.addPatient( new Patient(patientData))
  }
}
