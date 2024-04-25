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
      id: this.patientService.getDialogData().id,
      lastName: [this.patientService.getDialogData().lastName],
      maritalState: [this.patientService.getDialogData().maritalState],
      email: [
        this.patientService.getDialogData().email,
        [Validators.email, Validators.minLength(5)],
      ],
      bloodGroup: [this.patientService.getDialogData().bloodGroup],
      bloodPressure: [this.patientService.getDialogData().bloodPressure],
      birthDate: [this.patientService.getDialogData().birthDate],
      uploadFile: [this.patientService.getDialogData().img],
      doctorId: [this.patientService.getDialogData().doctorId],
    });
  }

  onSubmit() {
    const patientData : Patient = {
      id: this.patientForm.value.id.toString(),
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
      doctorId: this.patientForm.value.doctorId.toString(),
    };

    this.patientService.updatePatient(patientData)
  }
}
