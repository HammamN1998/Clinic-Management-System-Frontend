import {Component} from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
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
import { TranslateModule, TranslateService } from '@ngx-translate/core';

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
    MatButtonModule,
    NgIf,
    TranslateModule,
  ],
})
export class EditPatientComponent {
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

  createContactForm(): UntypedFormGroup {
    return this.fb.group({
      // Required Fields
      firstName: [this.patientService.getDialogData().firstName,[Validators.required]],
      gender: [this.patientService.getDialogData().gender, [Validators.required]],
      phoneNumber: [this.patientService.getDialogData().phoneNumber, [Validators.required]],
      address: [this.patientService.getDialogData().address, [Validators.required]],
      // Not required Fields
      condition: [this.patientService.getDialogData().condition],
      lastName: [this.patientService.getDialogData().lastName],
      maritalState: [this.patientService.getDialogData().maritalState],
      email: [
        this.patientService.getDialogData().email,
        [Validators.email, Validators.minLength(5)],
      ],
      bloodGroup: [this.patientService.getDialogData().bloodGroup],
      bloodPressure: [this.patientService.getDialogData().bloodPressure],
      weight: [this.patientService.getDialogData().weight],
      birthDate: [this.patientService.getDialogData().birthDate.toDate()],
      uploadFile: [this.patientService.getDialogData().img],
    });
  }

  onSubmit() {
    const updatePatient: Patient = this.patientService.getDialogData();
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
    updatePatient.weight = this.patientForm.value.weight.toString();
    updatePatient.condition = this.patientForm.value.condition.toString();

    this.patientService.updatePatient(updatePatient);
    this.router.navigate(['/admin/patients/patient-profile']);
    this.notificationService.showSnackBarNotification(
      'black',
      this.translate.instant('PATIENTS.MESSAGES.UPDATE_SUCCESS'),
      'bottom',
      'center'
    )
  }
  
  onCancel(): void {
    this.router.navigate(['/admin/patients/patient-profile']);
  }

}

