import { Component } from '@angular/core';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-medical-records',
  templateUrl: './medical-records.component.html',
  styleUrls: ['./medical-records.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent],
})
export class MedicalRecordsComponent {
  constructor() {
    // constructor code
  }
}
