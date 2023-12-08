import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { AmbulanceListService } from '../../ambulance-list.service';
import { MatButtonModule } from '@angular/material/button';

export interface DialogData {
  id: number;
  vehicle_no: string;
  vehicle_name: string;
  driver_name: string;
}

@Component({
    selector: 'app-delete:not(b)',
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
    public ambulanceListService: AmbulanceListService
  ) { }
  onNoClick(): void {
    this.dialogRef.close();
  }
  confirmDelete(): void {
    this.ambulanceListService.deleteAmbulanceList(this.data.id);
  }
}
