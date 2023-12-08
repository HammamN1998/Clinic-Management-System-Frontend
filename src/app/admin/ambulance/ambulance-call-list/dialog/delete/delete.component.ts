import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { AmbulanceCallListService } from '../../ambulance-call-list.service';
import { MatButtonModule } from '@angular/material/button';

export interface DialogData {
  id: number;
  patient_name: string;
  gender: string;
  driver_name: string;
}

@Component({
    selector: 'app-delete:not(a)',
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
    public ambulanceCallListService: AmbulanceCallListService
  ) { }
  onNoClick(): void {
    this.dialogRef.close();
  }
  confirmDelete(): void {
    this.ambulanceCallListService.deleteAmbulanceCallList(this.data.id);
  }
}
