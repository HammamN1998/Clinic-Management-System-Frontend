import { Injectable } from '@angular/core';
import { Direction } from '@angular/cdk/bidi';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DeleteComponent, DialogData } from './delete-confirm-dialog.component';

@Injectable({ providedIn: 'root' })
export class DeleteConfirmDialogService {
  constructor(private dialog: MatDialog) {}

  open(message: string): MatDialogRef<DeleteComponent> {
    const direction: Direction =
      localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';
    return this.dialog.open(DeleteComponent, {
      data: { message } satisfies DialogData,
      direction,
    });
  }
}
