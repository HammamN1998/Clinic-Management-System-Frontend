import { Component, Input } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldAppearance, MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ClinicDoctor } from '@core/models/clinic.model';
import { ClinicService } from '@core/service/clinic.service';

/** The doctor who did the work, picked from the clinic account's current doctors. Hidden in any other account. */
@Component({
  selector: 'app-provider-select',
  templateUrl: './provider-select.component.html',
  standalone: true,
  imports: [AsyncPipe, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, TranslateModule],
})
export class ProviderSelectComponent {
  @Input({ required: true }) control!: FormControl<string>;
  @Input() appearance: MatFormFieldAppearance = 'fill';

  readonly doctors$: Observable<ClinicDoctor[]>;

  constructor(clinicService: ClinicService) {
    this.doctors$ = clinicService.accountDoctors$.pipe(
      map((doctors) => doctors.filter((doctor) => doctor.active && !doctor.secretary)),
      // A secretary is not on the list, so his forms start on the clinic's admin, who is listed first.
      tap((doctors) => {
        if (doctors.length && !doctors.some((doctor) => doctor.doctorId === this.control.value)) {
          this.control.setValue(doctors[0].doctorId);
        }
      }),
    );
  }
}
