import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { MedicineListService } from '../../medicine-list.service';
import { UntypedFormControl, Validators, UntypedFormGroup, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MedicineList } from '../../medicine-list.model';
import { formatDate } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface DialogData {
  id: number;
  action: string;
  medicineList: MedicineList;
}
@Component({
    selector: 'app-form-dialog:not(j)',
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
        MatDatepickerModule,
        MatDialogClose,
    ],
})
export class FormDialogComponent {
  action: string;
  dialogTitle: string;
  medicineListForm: UntypedFormGroup;
  medicineList: MedicineList;
  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public medicineListService: MedicineListService,
    private fb: UntypedFormBuilder
  ) {
    // Set the defaults
    this.action = data.action;
    if (this.action === 'edit') {
      this.dialogTitle = data.medicineList.m_name;
      this.medicineList = data.medicineList;
    } else {
      this.dialogTitle = 'New MedicineList';
      const blankObject = {} as MedicineList;
      this.medicineList = new MedicineList(blankObject);
    }
    this.medicineListForm = this.createContactForm();
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
      id: [this.medicineList.id],
      m_no: [this.medicineList.m_no],
      m_name: [this.medicineList.m_name],
      category: [this.medicineList.category],
      company: [this.medicineList.company],
      p_date: [
        formatDate(this.medicineList.p_date, 'yyyy-MM-dd', 'en'),
        [Validators.required],
      ],
      price: [this.medicineList.price],
      e_date: [
        formatDate(this.medicineList.e_date, 'yyyy-MM-dd', 'en'),
        [Validators.required],
      ],
      stock: [this.medicineList.stock],
    });
  }
  submit() {
    // emppty stuff
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
  public confirmAdd(): void {
    this.medicineListService.addMedicineList(
      this.medicineListForm.getRawValue()
    );
  }
}
