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
import {PatientsService} from "@core/service/patients.service";

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
    private patientsService: PatientsService,
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
    this.patientsService.addPatient(
      this.patientForm.value.first.toString(),
      this.patientForm.value.last.toString(),
      this.patientForm.value.gender.toString(),
      this.patientForm.value.mobile.toString(),
      this.patientForm.value.dob.toString(),
      this.patientForm.value.age.toString(),
      this.patientForm.value.email.toString(),
      this.patientForm.value.maritalStatus.toString(),
      this.patientForm.value.address.toString(),
      this.patientForm.value.bGroup.toString(),
      this.patientForm.value.bPresure.toString(),
      this.patientForm.value.sugger.toString(),
      this.patientForm.value.injury.toString(),
    )
  }
}
