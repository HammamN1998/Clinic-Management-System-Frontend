import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ThirdlevelRoutingModule } from './thirdlevel-routing.module';
import { Third1Component } from './third1/third1.component';

@NgModule({
    imports: [CommonModule, ThirdlevelRoutingModule, Third1Component],
})
export class ThirdlevelModule { }
