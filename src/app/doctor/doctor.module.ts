import { NgModule } from '@angular/core';
import { NgxEchartsModule } from 'ngx-echarts';
import { DoctorRoutingModule } from './doctor-routing.module';

@NgModule({
    imports: [
        DoctorRoutingModule,
        NgxEchartsModule.forRoot({
            echarts: () => import('echarts'),
        }),
    ],
})
export class DoctorModule { }
