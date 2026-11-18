import { Component, Input } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldAppearance, MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ClinicDoctor } from '@core/models/clinic.model';
import { ClinicService } from '@core/service/clinic.service';

/**
 * The doctor who did the work, picked from the clinic account's current doctors, never a
 * secretary. A form starts on the signed-in doctor; a secretary, who is not listed, must pick one.
 * Hidden in any other account.
 */
@Component({
  selector: 'app-provider-select',
  templateUrl: './provider-select.component.html',
  standalone: true,
  imports: [AsyncPipe, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, TranslateModule],
})
export class ProviderSelectComponent {
  /** A form is rebuilt after each save, so the list is checked again for every new control. */
  @Input({ required: true }) set control(control: FormControl<string>) {
    this.formControl = control;
    this.controls.next(control);
  }
  @Input() appearance: MatFormFieldAppearance = 'fill';

  formControl!: FormControl<string>;
  readonly doctors$: Observable<ClinicDoctor[]>;
  private readonly controls = new BehaviorSubject<FormControl<string> | null>(null);

  constructor(clinicService: ClinicService) {
    this.doctors$ = combineLatest([
      clinicService.accountDoctors$.pipe(map((doctors) => doctors.filter((doctor) => doctor.active && !doctor.secretary))),
      this.controls,
    ]).pipe(
      tap(([doctors, control]) => {
        if (!control || !doctors.length) {
          return;
        }
        if (!doctors.some((doctor) => doctor.doctorId === control.value)) {
          control.setValue('');
        }
        control.addValidators(Validators.required);
        control.updateValueAndValidity();
      }),
      map(([doctors]) => doctors),
    );
  }
}
