import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-patients',
  templateUrl: './patients.component.html',
  styleUrls: ['./patients.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent, MatButtonModule],
})
export class PatientsComponent {
  constructor() {
    // constructor code
  }
}
