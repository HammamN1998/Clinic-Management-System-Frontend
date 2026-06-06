import { Component } from '@angular/core';
import {
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { TranslateModule } from '@ngx-translate/core';

export type PatientDocumentAction = 'detailed' | 'simple' | 'letter';

@Component({
  selector: 'app-patient-documents-dialog',
  standalone: true,
  templateUrl: './patient-documents.component.html',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    TranslateModule,
  ],
})
export class PatientDocumentsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<
      PatientDocumentsDialogComponent,
      PatientDocumentAction
    >,
  ) {}

  select(action: PatientDocumentAction): void {
    this.dialogRef.close(action);
  }
}
