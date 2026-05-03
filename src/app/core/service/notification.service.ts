import { Injectable } from '@angular/core';
import {MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition} from "@angular/material/snack-bar";
import Swal, {SweetAlertIcon, SweetAlertPosition} from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor(
    private snackBar: MatSnackBar
  ) { }

  showSnackBarNotification(
    colorName: string,
    text: string,
    placementFrom: MatSnackBarVerticalPosition,
    placementAlign: MatSnackBarHorizontalPosition
  ) {
    this.snackBar.open(text, '', {
      duration: 2000,
      verticalPosition: placementFrom,
      horizontalPosition: placementAlign,
      panelClass: colorName,
    });
  }
  showSwalNotification(
    title: string,
    icon: SweetAlertIcon = 'info',
    position: SweetAlertPosition = 'top-end',
    showConfirmButton: boolean = false,
    autoDisappear: boolean = true
  ) {
    Swal.fire({
      position: position,
      icon: icon,
      title: title,
      showConfirmButton: showConfirmButton,
      timer: autoDisappear ? 1500 : undefined,
    });
  }

  showSwalDialogWithFunction(
    title: string, 
    text: string, 
    icon: SweetAlertIcon = 'warning', 
    showCancelButton: boolean = true, 
    confirmButtonText: string,
    onConfirm: () => void
  ) {
    Swal.fire({
      title: title,
      text: text,
      icon: icon,
      showCancelButton: showCancelButton,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: confirmButtonText,
    }).then((result) => {
      if (result.isConfirmed) {
        onConfirm();
      }
    });
  }
}
