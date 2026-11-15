import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { DoctorProfileComponent } from "./doctor-profile/doctor-profile.component";
import { Page404Component } from "../../authentication/page404/page404.component";
import {DoctorPlansComponent} from "./doctor-plans/doctor-plans.component";
import { MyClinicComponent } from "./my-clinic/my-clinic.component";
import { OwnAccountGuard } from "@core/guard/own-account.guard";
const routes: Routes = [

  {
    path: "doctor-profile",
    component: DoctorProfileComponent,
    canActivate: [OwnAccountGuard],
  },
  {
    path: "doctor-plans",
    component: DoctorPlansComponent,
    canActivate: [OwnAccountGuard],
  },
  {
    path: "my-clinic",
    component: MyClinicComponent,
    canActivate: [OwnAccountGuard],
  },
  { path: "**", component: Page404Component },
];
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DoctorsRoutingModule { }
