import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ClinicTerms } from '@core/models/clinic.model';

/** The terms of a clinic invitation or agreement, one row per term. */
@Component({
  selector: 'app-clinic-terms',
  templateUrl: './clinic-terms.component.html',
  styleUrls: ['./clinic-terms.component.scss'],
  standalone: true,
  imports: [TranslateModule],
})
export class ClinicTermsComponent {
  @Input({ required: true }) terms!: ClinicTerms;
}
