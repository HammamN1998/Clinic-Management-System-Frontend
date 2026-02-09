import { Page404Component } from "./../../authentication/page404/page404.component";
import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { MainComponent } from "./main/main.component";
const routes: Routes = [
  {
    path: "",
    redirectTo: "main",
    pathMatch: "full",
  },
  {
    path: "main",
    component: MainComponent,
  },
  {
    path: "treatments",
    loadComponent: () =>
      import("./treatments/treatments.component").then((m) => m.TreatmentsComponent),
  },
  {
    path: "earnings",
    loadComponent: () =>
      import("./earnings/earnings.component").then((m) => m.EarningsComponent),
  },
  { path: "**", component: Page404Component },
];
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule { }
