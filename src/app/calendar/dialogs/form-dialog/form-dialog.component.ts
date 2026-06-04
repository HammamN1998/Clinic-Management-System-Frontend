import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { CalendarService } from '../../calendar.service';
import { UntypedFormControl, Validators, UntypedFormGroup, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Calendar } from '../../calendar.model';
import { OwlDateTimeModule } from '@danielmoncada/angular-datetime-picker';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DeleteConfirmDialogService } from '@shared/components/delete-confirm-dialog/delete-confirm-dialog.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export interface DialogData {
  id: number;
  action: string;
  calendar: Calendar;
}

@Component({
  selector: 'app-form-dialog:not(o)',
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
    OwlDateTimeModule,
    TranslateModule,
  ],
})
export class FormDialogComponent {
  action: string;
  dialogTitle: string;
  calendarForm: UntypedFormGroup;
  calendar: Calendar;
  showDeleteBtn = false;
  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public calendarService: CalendarService,
    private fb: UntypedFormBuilder,
    private deleteConfirmDialog: DeleteConfirmDialogService,
    private translate: TranslateService,
  ) {
    // Set the defaults
    this.action = data.action;
    if (this.action === 'edit') {
      this.dialogTitle = data.calendar.title;
      this.calendar = data.calendar;
      this.showDeleteBtn = true;
    } else {
      this.dialogTitle = this.translate.instant('CALENDAR.NEW_EVENT');
      const blankObject = {} as Calendar;
      this.calendar = new Calendar(blankObject);
      this.showDeleteBtn = false;
    }

    this.calendarForm = this.createContactForm();
  }
  formControl = new UntypedFormControl('', [
    Validators.required,
    // Validators.email,
  ]);
  getErrorMessage() {
    return this.formControl.hasError('required')
      ? this.translate.instant('CALENDAR.FORM.REQUIRED_FIELD')
      : this.formControl.hasError('email')
        ? this.translate.instant('CALENDAR.FORM.INVALID_EMAIL')
        : '';
  }
  createContactForm(): UntypedFormGroup {
    return this.fb.group({
      id: [this.calendar.id],
      title: [this.calendar.title, [Validators.required]],
      category: [this.calendar.category],
      startDate: [this.calendar.startDate, [Validators.required]],
      endDate: [this.calendar.endDate, [Validators.required]],
      details: [this.calendar.details],
      cost: [this.calendar.cost],
      costPaid: [this.calendar.costPaid],
    });
  }
  submit() {
    // emppty stuff
  }
  deleteEvent() {
    const title = this.calendarForm.get('title')?.value ?? '';
    const message = this.translate.instant('CALENDAR.MESSAGES.DELETE_CONFIRM', { title });
    const confirmRef = this.deleteConfirmDialog.open(message);
    confirmRef.afterClosed().subscribe((result) => {
      if (result !== 1) {
        return;
      }
      this.calendarService.deleteCalendar(this.calendarForm.getRawValue());
      this.dialogRef.close('delete');
    });
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
  public confirmAdd(): void {
    this.calendarService.addUpdateCalendar(this.calendarForm.getRawValue());
    this.dialogRef.close('submit');
  }
}
