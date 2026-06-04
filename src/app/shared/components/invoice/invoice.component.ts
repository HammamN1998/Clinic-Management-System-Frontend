import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { TranslateModule } from '@ngx-translate/core';
@Component({
  selector: 'app-invoice',
  templateUrl: './invoice.component.html',
  styleUrls: ['./invoice.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent, MatButtonModule, TranslateModule],
})
export class InvoiceComponent {
  constructor() {
    // constructor code
  }
}
