import {Component, Input} from '@angular/core';
import {MatDialog} from "@angular/material/dialog";
import {ImageComponent} from "@shared/components/image/image.component";
import {SharedModule} from "@shared";
import {FileUploadComponent} from "@shared/components/file-upload/file-upload.component";
import {PatientService} from "@core/service/patient.service";
import {FirebaseStorageService} from "@core/service/firebase-storage.service";
import { DeleteConfirmDialogService } from '@shared/components/delete-confirm-dialog/delete-confirm-dialog.service';
import { Attachment } from '@core/models/patient.model';
import { NotificationService } from '@core/service/notification.service';
import { TranslateService } from '@ngx-translate/core';
import { DoctorService } from '@core/service/doctor.service';

@Component({
  selector: 'app-full-screen-image',
  standalone: true,
  imports: [
    SharedModule,
    FileUploadComponent
  ],
  templateUrl: './full-screen-image.component.html',
  styleUrl: './full-screen-image.component.scss'
})
export class FullScreenImageComponent {

  @Input() imgUrl: string = '';

  showUploadPictureArea: boolean = false;
  showEditIcon: boolean = false;
  showDeleteIcon: boolean = false;

  constructor(
    private dialog: MatDialog,
    private deleteConfirmDialog: DeleteConfirmDialogService,
    private patientService: PatientService,
    private firebaseStorageService: FirebaseStorageService,
    private notificationService: NotificationService,
    private translate: TranslateService,
    private doctorService: DoctorService,
  ) {
  }

  get patient() {
    return this.patientService.getDialogData();
  }

  /** The account the patient belongs to, whose folder keeps his photo. */
  get accountId(): string {
    return this.doctorService.activeDoctorId;
  }

  private get patientFolder(): string {
    return `doctors/${this.accountId}/patients/${this.patient.id}`;
  }

  openFullscreen() {
    this.dialog.open(ImageComponent, {
      data: this.imgUrl
    })
  }

  editImage() {
    this.showUploadPictureArea = !this.showUploadPictureArea;
  }

  deleteImage() {
    const dialogRef = this.deleteConfirmDialog.open(this.translate.instant('SHARED.IMAGE.DELETE_CONFIRM'));

    dialogRef.afterClosed().subscribe((result) => {
      if (result !== 1) {
        return;
      }
      const finalizeDelete = () => {
        this.patient.img = '';
        this.patient.imgSize = 0;
        this.patientService.updatePatient(this.patient).catch((error) => this.notifySaveFailed(error));
      };
      if (this.patient.img === '') {
        finalizeDelete();
        return;
      }
      this.firebaseStorageService.deleteFile(this.patient.img, this.patientFolder).subscribe({
        next: () => finalizeDelete(),
        error: (error) => {
          console.log('error: ' + error);
          this.notificationService.showSwalOkDialog(
            this.translate.instant('SHARED.IMAGE.DELETE_ERROR'),
            'error',
          );
        },
      });
    });

  }

  /** The upload already passed the plan checks, and the server adds the file to the storage use. */
  updatePatientProfilePicture(attachment: Attachment) {
    if (this.patient.img === '') {
      this.patient.img = attachment.url;
      this.patient.imgSize = attachment.size;
      this.patientService.updatePatient(this.patient).catch((error) => this.notifySaveFailed(error));
      this.showUploadPictureArea = !this.showUploadPictureArea;
    } else {
      this.firebaseStorageService.deleteFile(this.patient.img, this.patientFolder).subscribe({
        next: () => {
          this.patient.img = attachment.url;
          this.patient.imgSize = attachment.size;
          this.patientService.updatePatient(this.patient).catch((error) => this.notifySaveFailed(error));
        },
        error: (error) => {
          console.log('error: ' + error);
          this.notificationService.showSwalOkDialog(
            this.translate.instant('SHARED.IMAGE.REPLACE_ERROR'),
            'error',
          );
        },
      });
      this.showUploadPictureArea = !this.showUploadPictureArea;
    }
  }

  showControl() {
    if (this.showDeleteIcon && this.showEditIcon) return;

    this.showEditIcon = true;
    this.showDeleteIcon = true;

    setTimeout(() => {
      this.showEditIcon = false;
      this.showDeleteIcon = false;
    }, 10000);
  }

  private notifySaveFailed(error: unknown): void {
    console.log('error: ' + error);
    this.notificationService.showSnackBarNotification(
      'snackbar-danger',
      this.translate.instant('COMMON.SAVE_FAILED'),
      'bottom',
      'center',
    );
  }

}
