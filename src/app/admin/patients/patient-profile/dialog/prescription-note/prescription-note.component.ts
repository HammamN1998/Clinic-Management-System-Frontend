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

@Component({
  selector: 'app-prescription-note-dialog',
  standalone: true,
  templateUrl: './prescription-note.component.html',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
    TranslateModule,
  ],
})
export class PrescriptionNoteDialogComponent {
  note = '';

  constructor(
    public dialogRef: MatDialogRef<PrescriptionNoteDialogComponent>,
  ) {}

  download(): void {
    this.dialogRef.close((this.note ?? '').trim());
  }
}
