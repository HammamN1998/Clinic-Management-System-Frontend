import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { DoctorProfileComponent } from "./doctor-profile/doctor-profile.component";
import { Page404Component } from "../../authentication/page404/page404.component";
import {DoctorPlansComponent} from "./doctor-plans/doctor-plans.component";
const routes: Routes = [

  {
    path: "doctor-profile",
    component: DoctorProfileComponent,
  },
  {
    path: "doctor-plans",
    component: DoctorPlansComponent,
  },
  { path: "**", component: Page404Component },
];
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DoctorsRoutingModule { }
