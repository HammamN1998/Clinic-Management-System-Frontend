import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-today-appointment',
  templateUrl: './today-appointment.component.html',
  styleUrls: ['./today-appointment.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    MatButtonModule,
    MatIconModule,
  ],
})
export class TodayAppointmentComponent {
  constructor() {
    // constructor code
  }
}
