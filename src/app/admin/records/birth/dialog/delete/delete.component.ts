import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { BirthService } from '../../birth.service';
import { MatButtonModule } from '@angular/material/button';

export interface DialogData {
  id: number;
  child_name: string;
  gender: string;
  mother_name: string;
}

@Component({
    selector: 'app-delete:not(k)',
    templateUrl: './delete.component.html',
    styleUrls: ['./delete.component.scss'],
    standalone: true,
    imports: [
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatButtonModule,
        MatDialogClose,
    ],
})
export class DeleteDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public birthService: BirthService
  ) { }
  onNoClick(): void {
    this.dialogRef.close();
  }
  confirmDelete(): void {
    this.birthService.deleteBirth(this.data.id);
  }
}
