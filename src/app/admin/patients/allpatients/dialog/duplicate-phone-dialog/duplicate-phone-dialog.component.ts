import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { NgFor } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Patient } from '@core/models/patient.model';

export interface DuplicatePhoneDialogData {
  phoneNumber: string;
  patients: Patient[];
}

export type DuplicatePhoneDialogResult =
  | { action: 'continue' }
  | { action: 'navigate'; patient: Patient };

@Component({
  selector: 'app-duplicate-phone-dialog',
  templateUrl: './duplicate-phone-dialog.component.html',
  styleUrls: ['./duplicate-phone-dialog.component.scss'],
  standalone: true,
  imports: [
    NgFor,
    MatButtonModule,
    MatRippleModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    TranslateModule,
  ],
})
export class DuplicatePhoneDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DuplicatePhoneDialogComponent, DuplicatePhoneDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: DuplicatePhoneDialogData,
  ) {}

  getDisplayName(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`.replace(/\s+/g, ' ').trim();
  }

  selectPatient(patient: Patient): void {
    this.dialogRef.close({ action: 'navigate', patient });
  }

  continueAdding(): void {
    this.dialogRef.close({ action: 'continue' });
  }
}
