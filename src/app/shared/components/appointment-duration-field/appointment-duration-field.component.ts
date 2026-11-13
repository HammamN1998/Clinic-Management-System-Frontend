import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldAppearance, MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppDurationPipe } from '@core/pipe/app-duration.pipe';
import { DoctorService } from '@core/service/doctor.service';
import { NotificationService } from '@core/service/notification.service';
import { DURATION_OPTIONS, doctorDefaultDuration } from '@core/util/appointment-form.util';

type SaveState = 'idle' | 'saving' | 'saved';

const SAVED_INDICATOR_MS = 1500;

/**
 * Appointment duration picker. When the picked value differs from the doctor's default,
 * a "Set as default" action appears in the field's trailing slot. It sits beside the
 * select rather than inside its trigger, because the trigger is a single combobox and
 * cannot host a second interactive element accessibly.
 */
@Component({
  selector: 'app-appointment-duration-field',
  templateUrl: './appointment-duration-field.component.html',
  styleUrls: ['./appointment-duration-field.component.scss'],
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslateModule,
    AppDurationPipe,
  ],
})
export class AppointmentDurationFieldComponent implements OnDestroy {
  @Input({ required: true }) control!: FormControl<number>;
  @Input() allowSetDefault = true;
  @Input() appearance: MatFormFieldAppearance = 'outline';
  @Output() durationChange = new EventEmitter<number>();

  readonly options = DURATION_OPTIONS;
  saveState: SaveState = 'idle';
  private savedTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private doctorService: DoctorService,
    private notificationService: NotificationService,
    private translate: TranslateService,
    private liveAnnouncer: LiveAnnouncer,
  ) {}

  get defaultMinutes(): number {
    return doctorDefaultDuration(this.doctorService.doctor);
  }

  get isActionVisible(): boolean {
    if (!this.allowSetDefault) {
      return false;
    }
    return this.saveState !== 'idle' || this.control.value !== this.defaultMinutes;
  }

  onSelectionChange(change: MatSelectChange): void {
    this.durationChange.emit(change.value);
  }

  async setAsDefault(event: Event): Promise<void> {
    // The form field opens the select on any click inside its container.
    event.stopPropagation();
    event.preventDefault();
    if (this.saveState !== 'idle') {
      return;
    }
    const minutes = this.control.value;
    this.saveState = 'saving';
    try {
      await this.doctorService.setDefaultAppointmentDuration(minutes);
      this.saveState = 'saved';
      void this.liveAnnouncer.announce(this.translate.instant('APPOINTMENT_DURATION.DEFAULT_SAVED'), 'polite');
      this.savedTimer = setTimeout(() => (this.saveState = 'idle'), SAVED_INDICATOR_MS);
    } catch (error) {
      this.saveState = 'idle';
      console.log('error: ' + error);
      this.notificationService.showSnackBarNotification(
        'snackbar-danger',
        this.translate.instant('APPOINTMENT_DURATION.DEFAULT_SAVE_ERROR'),
        'bottom',
        'center',
      );
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.savedTimer);
  }
}
