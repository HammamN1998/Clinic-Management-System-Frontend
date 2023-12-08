import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { AmbulanceListService } from '../../ambulance-list.service';
import { UntypedFormControl, Validators, UntypedFormGroup, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AmbulanceList } from '../../ambulance-list.model';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface DialogData {
  id: number;
  action: string;
  ambulanceList: AmbulanceList;
}

@Component({
    selector: 'app-form-dialog:not(b)',
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
        MatSelectModule,
        MatOptionModule,
        MatDialogClose,
    ],
})
export class FormDialogComponent {
  action: string;
  dialogTitle: string;
  ambulanceListForm: UntypedFormGroup;
  ambulanceList: AmbulanceList;
  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public ambulanceListService: AmbulanceListService,
    private fb: UntypedFormBuilder
  ) {
    // Set the defaults
    this.action = data.action;
    if (this.action === 'edit') {
      this.dialogTitle = data.ambulanceList.vehicle_no;
      this.ambulanceList = data.ambulanceList;
    } else {
      this.dialogTitle = 'Add Ambulance Call';
      const blankObject = {} as AmbulanceList;
      this.ambulanceList = new AmbulanceList(blankObject);
    }
    this.ambulanceListForm = this.createContactForm();
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
      id: [this.ambulanceList.id],
      vehicle_no: [this.ambulanceList.vehicle_no],
      vehicle_name: [this.ambulanceList.vehicle_name],
      year_made: [this.ambulanceList.year_made],
      driver_name: [this.ambulanceList.driver_name],
      driver_license_no: [this.ambulanceList.driver_license_no],
      driver_no: [this.ambulanceList.driver_no],
      vehicle_type: [this.ambulanceList.vehicle_type],
      note: [this.ambulanceList.note],
    });
  }
  submit() {
    // emppty stuff
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
  public confirmAdd(): void {
    this.ambulanceListService.addAmbulanceList(
      this.ambulanceListForm.getRawValue()
    );
  }
}
