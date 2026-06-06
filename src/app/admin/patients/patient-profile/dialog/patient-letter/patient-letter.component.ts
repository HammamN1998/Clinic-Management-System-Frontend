import { Component } from '@angular/core';
import {
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

export interface PatientLetterResult {
  title: string;
  body: string;
}

@Component({
  selector: 'app-patient-letter-dialog',
  standalone: true,
  templateUrl: './patient-letter.component.html',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
    TranslateModule,
  ],
})
export class PatientLetterDialogComponent {
  title = '';
  body = '';

  constructor(
    public dialogRef: MatDialogRef<PatientLetterDialogComponent, PatientLetterResult>,
  ) {}

  download(): void {
    if (!this.body.trim()) {
      return;
    }
    this.dialogRef.close({
      title: this.title.trim(),
      body: this.body.trim(),
    });
  }
}
