import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { DoctorsService } from '../../doctors.service';
import { UntypedFormControl, Validators, UntypedFormGroup, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Doctors } from '../../doctors.model';
import { formatDate } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface DialogData {
  id: number;
  action: string;
  doctors: Doctors;
}

@Component({
    selector: 'app-form-dialog:not(f)',
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
        MatDatepickerModule,
        MatDialogClose,
    ],
})
export class FormDialogComponent {
  action: string;
  dialogTitle: string;
  doctorsForm: UntypedFormGroup;
  doctors: Doctors;
  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public doctorsService: DoctorsService,
    private fb: UntypedFormBuilder
  ) {
    // Set the defaults
    this.action = data.action;
    if (this.action === 'edit') {
      this.dialogTitle = data.doctors.name;
      this.doctors = data.doctors;
    } else {
      this.dialogTitle = 'New Doctors';
      const blankObject = {} as Doctors;
      this.doctors = new Doctors(blankObject);
    }
    this.doctorsForm = this.createContactForm();
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
      id: [this.doctors.id],
      img: [this.doctors.img],
      name: [this.doctors.name],
      email: [this.doctors.email],
      date: [
        formatDate(this.doctors.date, 'yyyy-MM-dd', 'en'),
        [Validators.required],
      ],
      specialization: [this.doctors.specialization],
      mobile: [this.doctors.mobile],
      department: [this.doctors.department],
      degree: [this.doctors.degree],
    });
  }
  submit() {
    // emppty stuff
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
  public confirmAdd(): void {
    this.doctorsService.addDoctors(this.doctorsForm.getRawValue());
  }
}
