import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { AmbulanceCallListService } from '../../ambulance-call-list.service';
import { UntypedFormControl, Validators, UntypedFormGroup, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AmbulanceCallList } from '../../ambulance-call-list.model';
import { formatDate } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatRadioModule } from '@angular/material/radio';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface DialogData {
  id: number;
  action: string;
  ambulanceCallList: AmbulanceCallList;
}
@Component({
    selector: 'app-form-dialog:not(a)',
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
        MatDialogClose,
    ],
})
export class FormDialogComponent {
  action: string;
  dialogTitle: string;
  ambulanceCallListForm: UntypedFormGroup;
  ambulanceCallList: AmbulanceCallList;
  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public ambulanceCallListService: AmbulanceCallListService,
    private fb: UntypedFormBuilder
  ) {
    // Set the defaults
    this.action = data.action;
    if (this.action === 'edit') {
      this.dialogTitle = data.ambulanceCallList.patient_name;
      this.ambulanceCallList = data.ambulanceCallList;
    } else {
      this.dialogTitle = 'Add Ambulance Call';
      const blankObject = {} as AmbulanceCallList;
      this.ambulanceCallList = new AmbulanceCallList(blankObject);
    }
    this.ambulanceCallListForm = this.createContactForm();
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
      id: [this.ambulanceCallList.id],
      case_no: [this.ambulanceCallList.case_no],
      patient_name: [this.ambulanceCallList.patient_name],
      gender: [this.ambulanceCallList.gender],
      date: [
        formatDate(this.ambulanceCallList.date, 'yyyy-MM-dd', 'en'),
        [Validators.required],
      ],
      vehicle_no: [this.ambulanceCallList.vehicle_no],
      driver_name: [this.ambulanceCallList.driver_name],
      driver_no: [this.ambulanceCallList.driver_no],
      patient_address: [this.ambulanceCallList.patient_address],
      note: [this.ambulanceCallList.note],
    });
  }
  submit() {
    // emppty stuff
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
  public confirmAdd(): void {
    this.ambulanceCallListService.addAmbulanceCallList(
      this.ambulanceCallListForm.getRawValue()
    );
  }
}
