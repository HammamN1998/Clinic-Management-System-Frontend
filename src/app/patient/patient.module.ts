import { NgModule } from '@angular/core';
import { NgxEchartsModule } from 'ngx-echarts';
import { PatientRoutingModule } from './patient-routing.module';

@NgModule({
    imports: [
        NgxEchartsModule.forRoot({
            echarts: () => import('echarts'),
        }),
        PatientRoutingModule,
    ],
})
export class PatientModule { }
