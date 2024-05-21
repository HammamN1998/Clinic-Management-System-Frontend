import { NgModule } from '@angular/core';
import { FileUploadComponent } from './file-upload/file-upload.component';
import { BreadcrumbComponent } from './breadcrumb/breadcrumb.component';
import {SharedModule} from "@shared";


@NgModule({
    imports: [SharedModule, FileUploadComponent, BreadcrumbComponent],
    exports: [FileUploadComponent, BreadcrumbComponent],
})
export class ComponentsModule { }
