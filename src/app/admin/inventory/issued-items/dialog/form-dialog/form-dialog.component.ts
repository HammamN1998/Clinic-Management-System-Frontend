import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { IssuedItemsService } from '../../issued-items.service';
import { UntypedFormControl, Validators, UntypedFormGroup, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IssuedItems } from '../../issued-items.model';
import { formatDate } from '@angular/common';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface DialogData {
  id: number;
  action: string;
  issuedItems: IssuedItems;
}

@Component({
    selector: 'app-form-dialog:not(g)',
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
        MatRadioModule,
        MatDialogClose,
    ],
})
export class FormDialogComponent {
  action: string;
  dialogTitle: string;
  issuedItemsForm: UntypedFormGroup;
  issuedItems: IssuedItems;
  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public issuedItemsService: IssuedItemsService,
    private fb: UntypedFormBuilder
  ) {
    // Set the defaults
    this.action = data.action;
    if (this.action === 'edit') {
      this.dialogTitle = data.issuedItems.i_name;
      this.issuedItems = data.issuedItems;
    } else {
      this.dialogTitle = 'New Item Issue';
      const blankObject = {} as IssuedItems;
      this.issuedItems = new IssuedItems(blankObject);
    }
    this.issuedItemsForm = this.createContactForm();
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
      id: [this.issuedItems.id],
      i_name: [this.issuedItems.i_name],
      category: [this.issuedItems.category],
      issue_date: [
        formatDate(this.issuedItems.issue_date, 'yyyy-MM-dd', 'en'),
        [Validators.required],
      ],
      return_date: [
        formatDate(this.issuedItems.return_date, 'yyyy-MM-dd', 'en'),
        [Validators.required],
      ],
      issue_to: [this.issuedItems.issue_to],
      qty: [this.issuedItems.qty],
      status: [this.issuedItems.status],
    });
  }
  submit() {
    // emppty stuff
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
  public confirmAdd(): void {
    this.issuedItemsService.addIssuedItems(this.issuedItemsForm.getRawValue());
  }
}
