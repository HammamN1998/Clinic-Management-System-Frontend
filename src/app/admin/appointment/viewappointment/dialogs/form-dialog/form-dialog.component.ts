import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { AppointmentService } from '../../appointment.service';
import { UntypedFormControl, Validators, UntypedFormGroup, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Appointment } from '../../appointment.model';
import { MAT_DATE_LOCALE, MatOptionModule } from '@angular/material/core';
import { formatDate } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatRadioModule } from '@angular/material/radio';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface DialogData {
  id: number;
  action: string;
  appointment: Appointment;
}

@Component({
  selector: 'app-form-dialog:not(c)',
  templateUrl: './form-dialog.component.html',
  styleUrls: ['./form-dialog.component.scss'],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'en-GB' }],
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
  ],
})
export class FormDialogComponent {
  action: string;
  dialogTitle: string;
  appointmentForm: UntypedFormGroup;
  appointment: Appointment;
  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public appointmentService: AppointmentService,
    private fb: UntypedFormBuilder
  ) {
    // Set the defaults
    this.action = data.action;
    if (this.action === 'edit') {
      console.log(data.appointment.date);
      this.dialogTitle = data.appointment.name;
      this.appointment = data.appointment;
    } else {
      this.dialogTitle = 'New Appointment';
      const blank = {} as Appointment;
      this.appointment = new Appointment(blank);
    }
    this.appointmentForm = this.createContactForm();
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
      id: [this.appointment.id],
      img: [this.appointment.img],
      name: [this.appointment.name, [Validators.required]],
      email: [
        this.appointment.email,
        [Validators.required, Validators.email, Validators.minLength(5)],
      ],
      gender: [this.appointment.gender],
      date: [
        formatDate(this.appointment.date, 'yyyy-MM-dd', 'en'),
        [Validators.required],
      ],
      time: [this.appointment.time, [Validators.required]],
      mobile: [this.appointment.mobile, [Validators.required]],
      doctor: [this.appointment.doctor, [Validators.required]],
      injury: [this.appointment.injury],
    });
  }
  submit() {
    // emppty stuff
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
  public confirmAdd(): void {
    this.appointmentService.addAppointment(this.appointmentForm.getRawValue());
  }
}
