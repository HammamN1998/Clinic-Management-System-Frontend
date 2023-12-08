import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { IssuedItemsService } from '../../issued-items.service';
import { MatButtonModule } from '@angular/material/button';

export interface DialogData {
  id: number;
  category: string;
  issue_to: string;
  status: string;
}

@Component({
    selector: 'app-delete:not(g)',
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
    public issuedItemsService: IssuedItemsService
  ) { }
  onNoClick(): void {
    this.dialogRef.close();
  }
  confirmDelete(): void {
    this.issuedItemsService.deleteIssuedItems(this.data.id);
  }
}
