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
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

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
    private router: Router,
    private translate: TranslateService,
  ) {
  }

  get patient() {
    return this.patientService.getDialogData();
  }

  get doctor() {
    return this.patientService.doctor;
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
        const removedSize = this.patient.imgSize ?? 0;
        this.patient.img = '';
        this.patient.imgSize = 0;
        this.patientService.updatePatient(this.patient);
        this.doctor.subscription.storageBytesUsed = Math.max(
          0,
          this.doctor.subscription.storageBytesUsed - removedSize,
        );
      };
      if (this.patient.img === '') {
        finalizeDelete();
        return;
      }
      this.firebaseStorageService.deleteFile(this.patient.img).subscribe({
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

  updatePatientProfilePicture(attachment: Attachment) {
    if (this.doctor.subscription.storageBytesUsed + attachment.size > this.doctor.subscription.maxStorageLimitBytes || this.doctor.subscription.status !== 'active') {
      this.notificationService.showSwalDialogWithFunction(
        this.doctor.subscription.status !== 'active' ?
          this.translate.instant('PATIENTS.MESSAGES.PLAN_INACTIVE_TITLE') :
          this.translate.instant('PATIENTS.PROFILE.MESSAGES.UPGRADE_STORAGE_TITLE'),
        this.doctor.subscription.status !== 'active' ?
          this.translate.instant('PATIENTS.MESSAGES.PLAN_INACTIVE_TEXT') :
          this.translate.instant('PATIENTS.PROFILE.MESSAGES.UPGRADE_STORAGE_TEXT', { bytes: this.doctor.subscription.maxStorageLimitBytes }),
        'error',
        true,
        this.translate.instant('PATIENTS.MESSAGES.GO_TO_PLAN'),
        () => {
          this.router.navigate(['/admin/doctors/doctor-plans']);
        }
      );
      return;
    }
    if (this.patient.img === '') {
      this.patient.img = attachment.url;
      this.patient.imgSize = attachment.size;
      this.patientService.updatePatient(this.patient);
      this.showUploadPictureArea = !this.showUploadPictureArea;
      this.doctor.subscription.storageBytesUsed += attachment.size;
    } else {
      const oldImgSize = this.patient.imgSize;
      const oldImgUrl = this.patient.img;
      this.firebaseStorageService.deleteFile(oldImgUrl).subscribe({
        next: () => {
          this.patient.img = attachment.url;
          this.patient.imgSize = attachment.size;
          this.patientService.updatePatient(this.patient);
          this.doctor.subscription.storageBytesUsed += attachment.size - oldImgSize;
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

}
