import { NgModule } from '@angular/core';
import { FormsRoutingModule } from './forms-routing.module';
import { provideNgxMask } from 'ngx-mask';

@NgModule({
  imports: [
    FormsRoutingModule,
  ],
  providers: [provideNgxMask()],
})
export class FormModule { }
