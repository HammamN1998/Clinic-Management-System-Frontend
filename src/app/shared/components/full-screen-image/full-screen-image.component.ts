import {Component, Input} from '@angular/core';
import {MatDialog} from "@angular/material/dialog";
import {ImageComponent} from "@shared/components/image/image.component";
import {SharedModule} from "@shared";
import {FileUploadComponent} from "@shared/components/file-upload/file-upload.component";
import {PatientService} from "@core/service/patient.service";
import {FirebaseStorageService} from "@core/service/firebase-storage.service";
import {Direction} from "@angular/cdk/bidi";
import {DeleteComponent} from "../../../admin/patients/allpatients/dialog/delete/delete.component";
import { Attachment } from '@core/models/patient.model';
import { NotificationService } from '@core/service/notification.service';
import { Router } from '@angular/router';

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
    private patientService: PatientService,
    private firebaseStorageService: FirebaseStorageService,
    private notificationService: NotificationService,
    private router: Router,
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
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(DeleteComponent, {
      direction: tempDirection,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        if (this.patient.img !== '') this.firebaseStorageService.deleteFile(this.patient.img);
        this.patientService.updateStorageBytesUsed(-this.patient.imgSize);
        this.patient.img = '';
        this.patient.imgSize = 0;
        this.patientService.updatePatient(this.patient);
      }
    });

  }

  updatePatientProfilePicture(attachment: Attachment) {
    if (this.doctor.storageBytesUsed + attachment.size > this.doctor.maxStorageLimitBytes || this.doctor.status !== 'active') {
      this.notificationService.showSwalDialogWithFunction(
        this.doctor.status !== 'active' ? 
          'Your plan is not active.' :
          'Upgrade your plan to add more storage',
        this.doctor.status !== 'active' ? 
          'Check your billing portal in plans page.' :
          `You have reached the maximum storage for your plan (${this.doctor.maxStorageLimitBytes} bytes). \nYou can upgrade your plan to add more storage.`,
        'error',
        true,
        'Go to plan page',
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
      this.patientService.updateStorageBytesUsed(attachment.size);
      this.showUploadPictureArea = !this.showUploadPictureArea;
    } else {
      let oldImgSize = this.patient.imgSize;
      this.firebaseStorageService.deleteFile(this.patient.img);
      this.patient.img = attachment.url;
      this.patient.imgSize = attachment.size;
      this.patientService.updatePatient(this.patient);
      this.patientService.updateStorageBytesUsed(attachment.size - oldImgSize);
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
