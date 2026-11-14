import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ClinicDoctorsComponent } from './doctors/clinic-doctors.component';
import { Page404Component } from '../authentication/page404/page404.component';

const routes: Routes = [
  { path: '', redirectTo: 'doctors', pathMatch: 'full' },
  {
    path: 'doctors',
    component: ClinicDoctorsComponent,
  },
  { path: '**', component: Page404Component },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClinicRoutingModule {}
