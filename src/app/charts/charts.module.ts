import { NgModule } from '@angular/core';
import { ChartsRoutingModule } from './charts-routing.module';
import { NgxEchartsModule } from 'ngx-echarts';
@NgModule({
    imports: [
        ChartsRoutingModule,
        NgxEchartsModule.forRoot({
            echarts: () => import('echarts'),
        }),
    ],
})
export class ChartsModule { }
