import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { PatientService } from '@core/service/patient.service';
import { UntypedFormControl, Validators, UntypedFormGroup, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Patient } from '@core/models/patient.model';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatRadioModule } from '@angular/material/radio';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {NgIf} from "@angular/common";
import {Router} from "@angular/router";
import {isNullOrUndefined} from "@swimlane/ngx-datatable";

export interface DialogData {
  id: number;
  action: string;
  patient: Patient;
}

@Component({
    selector: 'app-form-dialog:not(i)',
    templateUrl: './form-dialog.component.html',
    styleUrls: ['./form-dialog.component.scss'],
    standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatDialogContent,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatDatepickerModule,
    MatSelectModule,
    MatOptionModule,
    MatDialogClose,
    NgIf,
  ],
})
export class FormDialogComponent {
  action: string;
  dialogTitle: string;
  patientForm: UntypedFormGroup;
  patient: Patient;
  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public patientService: PatientService,
    private fb: UntypedFormBuilder,
    private router: Router,
  ) {
    // Set the defaults
    this.action = data.action;
    if (this.action === 'edit') {
      this.dialogTitle = data.patient.firstName;
      this.patient = data.patient;
    } else {
      this.dialogTitle = 'New Patient';
      this.patient = new Patient();
    }
    this.patientForm = this.createContactForm();
  }
  formControl = new UntypedFormControl('', [
    Validators.required,
    // Validators.email,
  ]);
  getErrorMessage() {
    return this.formControl.hasError('required')
      ? 'Required field'
      : this.formControl.hasError('email')
        ? 'Not a valid email'
        : '';
  }
  createContactForm(): UntypedFormGroup {
    return this.fb.group({
      // Required Fields
      firstName: [this.patient.firstName, [Validators.required]],
      gender: [this.patient.gender, [Validators.required]],
      phoneNumber: [this.patient.phoneNumber, [Validators.required]],
      address: [this.patient.address, [Validators.required]],
      condition: [this.patient.condition, [Validators.required]],
      // Non Required Fields
      lastName: [this.patient.lastName],
      birthDate: [this.patient.birthDate.toDate()],
      email: [this.patient.email],
      maritalState: [this.patient.maritalState],
      bloodGroup: [this.patient.bloodGroup],
      bloodPressure: [this.patient.bloodPressure],
      img: [this.patient.img],
    });
  }
  submit() {
    // empty stuff
    console.log('submit');
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
  public confirmAdd(): void {

  }

  goToFullEditPage(){
    this.dialogRef.close();
    this.router.navigate(['/admin/patients/edit-patient']);
  }

  goToFullAddPage() {
    this.dialogRef.close();
    this.router.navigate(['/admin/patients/add-patient']);
  }


  protected readonly isNullOrUndefined = isNullOrUndefined;
}
