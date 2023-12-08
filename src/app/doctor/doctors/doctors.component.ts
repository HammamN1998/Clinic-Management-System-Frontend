import { Component } from '@angular/core';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-doctors',
  templateUrl: './doctors.component.html',
  styleUrls: ['./doctors.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent],
})
export class DoctorsComponent {
  constructor() {
    // constructor code
  }
}
