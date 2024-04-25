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

@Component({
  selector: 'app-patient-profile',
  templateUrl: './patient-profile.component.html',
  styleUrls: ['./patient-profile.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, MatTabsModule],
})
export class PatientProfileComponent {
  patient!: Patient;
  constructor(
    private patientService: PatientService,
    private router: Router,
  ) {
    // constructor code
    this.patient = this.patientService.getDialogData();
  }


  goToEditPage() {
    this.patientService.dialogData = this.patient;
    this.router.navigate(['/admin/patients/edit-patient']);
  }

  deletePatient() {
    // TODO: show I dialog with confirmation
  }
}
