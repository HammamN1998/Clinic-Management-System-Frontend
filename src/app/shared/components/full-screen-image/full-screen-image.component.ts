import {Component, Input} from '@angular/core';
import {MatDialog} from "@angular/material/dialog";
import {ImageComponent} from "@shared/components/image/image.component";
import {SharedModule} from "@shared";
import {FileUploadComponent} from "@shared/components/file-upload/file-upload.component";
import {PatientService} from "@core/service/patient.service";
import {FirebaseStorageService} from "@core/service/firebase-storage.service";
import {Direction} from "@angular/cdk/bidi";
import {DeleteComponent} from "../../../admin/patients/allpatients/dialog/delete/delete.component";

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
  ) {
  }

  public get patient() {
    return this.patientService.getDialogData();
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
        this.patient.img = '';
        this.patientService.updatePatient(this.patient);
      }
    });

  }

  updatePatientProfilePicture(url: string) {
    if (this.patient.img !== '') this.firebaseStorageService.deleteFile(this.patient.img);
    this.patient.img = url;
    this.patientService.updatePatient(this.patient);
    this.showUploadPictureArea = !this.showUploadPictureArea;
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
