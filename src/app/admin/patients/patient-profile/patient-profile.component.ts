import { Component } from '@angular/core';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import {PatientService} from "@core/service/patient.service";
import {Patient} from "@core/models/patient.model";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatTabsModule} from "@angular/material/tabs";
import {Router} from "@angular/router";
import {MatDialog} from "@angular/material/dialog";
import {DeleteComponent, DialogData} from "../allpatients/dialog/delete/delete.component";
import {Direction} from "@angular/cdk/bidi";
import {NotificationService} from "@core/service/notification.service";
import {UnsubscribeOnDestroyAdapter} from "@shared";

@Component({
  selector: 'app-patient-profile',
  templateUrl: './patient-profile.component.html',
  styleUrls: ['./patient-profile.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, MatTabsModule],
})
export class PatientProfileComponent extends UnsubscribeOnDestroyAdapter{
  patient!: Patient;
  constructor(
    private patientService: PatientService,
    private router: Router,
    private dialog: MatDialog,
    private notificationService: NotificationService,
  ) {
    super();
    // constructor code
    this.patient = this.patientService.getDialogData();
  }


  goToEditPage() {
    this.patientService.dialogData = this.patient;
    this.router.navigate(['/admin/patients/edit-patient']);
  }

  deletePatient() {
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(DeleteComponent, {
      data: {
        id: this.patient.id,
        gender: this.patient.gender,
        phoneNumber: this.patient.phoneNumber,
        bloodGroup: this.patient.bloodGroup,
        name: this.patient.firstName + ' ' + this.patient.lastName,
      } as DialogData,
      direction: tempDirection,
    });

    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {

        // Delete patient from Firestore and local storage
        this.patientService.deletePatient(this.patient.id);
        this.router.navigate(['/admin/patients/all-patients']);
        this.notificationService.showNotification(
          'snackbar-danger',
          'Delete Record Successfully...!!!',
          'bottom',
          'center'
        );
      }
    });

  }
}
