import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {NgFor, NgIf} from "@angular/common";
import {isNullOrUndefined} from "@swimlane/ngx-datatable";

export interface PatientDeleteSummary {
  id: string;
  name: string;
  gender: string;
  bloodGroup: string;
  phoneNumber: string;
}

export interface DialogData extends Partial<PatientDeleteSummary> {
  patients?: PatientDeleteSummary[];
  attachmentName?: string;
}

@Component({
    selector: 'app-delete:not(i)',
    templateUrl: './delete.component.html',
    styleUrls: ['./delete.component.scss'],
    standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatDialogClose,
    NgIf,
    NgFor,
  ],
})
export class DeleteComponent {
  constructor(
    public dialogRef: MatDialogRef<DeleteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
  ) { }
  onNoClick(): void {
    this.dialogRef.close();
  }
  confirmDelete(): void {

  }

  protected readonly isNullOrUndefined = isNullOrUndefined;
}
