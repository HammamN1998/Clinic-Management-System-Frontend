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
  ],
})
export class EditPatientComponent {
  patientForm: UntypedFormGroup;
  formdata = {
    first: 'Pooja',
    last: 'Sarma',
    gender: 'Female',
    mobile: '123456789',
    age: '23',
    email: 'test@example.com',
    maritalStatus: '1',
    bGroup: 'O+',
    bPresure: '123',
    sugger: '150',
    injury: 'Fever',
    address: '101, Elanxa, New Yourk',
    dob: '1987-02-17T14:22:18Z',
    uploadFile: '',
  };
  constructor(private fb: UntypedFormBuilder) {
    this.patientForm = this.createContactForm();
  }
  onSubmit() {
    console.log('Form Value', this.patientForm.value);
  }
  createContactForm(): UntypedFormGroup {
    return this.fb.group({
      first: [
        this.formdata.first,
        [Validators.required, Validators.pattern('[a-zA-Z]+')],
      ],
      last: [this.formdata.last],
      gender: [this.formdata.gender, [Validators.required]],
      mobile: [this.formdata.mobile, [Validators.required]],
      age: [this.formdata.age],
      maritalStatus: [this.formdata.maritalStatus],
      email: [
        this.formdata.email,
        [Validators.required, Validators.email, Validators.minLength(5)],
      ],
      bGroup: [this.formdata.bGroup],
      bPresure: [this.formdata.bPresure],
      address: [this.formdata.address],
      dob: [this.formdata.dob, [Validators.required]],
      sugger: [this.formdata.sugger],
      injury: [this.formdata.injury],
      uploadFile: [this.formdata.uploadFile],
    });
  }
}
