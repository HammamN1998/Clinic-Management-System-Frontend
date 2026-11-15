import { PatientProfileComponent } from "./patient-profile/patient-profile.component";
import { EditPatientComponent } from "./edit-patient/edit-patient.component";
import { AddPatientComponent } from "./add-patient/add-patient.component";
import { AllpatientsComponent } from "./allpatients/allpatients.component";
import { DentalChartComponent } from "./dental-chart/dental-chart.component";
import { Page404Component } from "./../../authentication/page404/page404.component";
import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { EditAccessGuard } from "@core/guard/edit-access.guard";

const routes: Routes = [
  {
    path: "all-patients",
    component: AllpatientsComponent,
  },
  {
    path: "add-patient",
    component: AddPatientComponent,
    canActivate: [EditAccessGuard],
  },
  {
    path: "edit-patient",
    component: EditPatientComponent,
    canActivate: [EditAccessGuard],
  },
  {
    path: "patient-profile",
    component: PatientProfileComponent,
  },
  {
    path: "dental-chart",
    component: DentalChartComponent,
  },
  { path: "**", component: Page404Component },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PatientsRoutingModule { }
