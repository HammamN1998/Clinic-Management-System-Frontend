import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { ClinicService } from '@core/service/clinic.service';
import { MatSelectModule } from '@angular/material/select';
import { ClinicRole, ClinicTerms, TERMS_NOTES_MAX_LENGTH } from '@core/models/clinic.model';

export type TermsDialogData =
  | { mode: 'invite' }
  | { mode: 'propose'; doctorId: string; doctorName: string; terms: ClinicTerms };

const DEFAULT_TERMS: ClinicTerms = { commissionPercent: 0, notes: '' };

function createForm(fb: FormBuilder, data: TermsDialogData) {
  const terms = data.mode === 'propose' ? data.terms : DEFAULT_TERMS;
  return fb.nonNullable.group({
    email: ['', data.mode === 'invite' ? [Validators.required, Validators.email, Validators.maxLength(254)] : []],
    role: ['doctor' as ClinicRole],
    commissionPercent: [terms.commissionPercent, [Validators.required, Validators.min(0), Validators.max(100)]],
    notes: [terms.notes, Validators.maxLength(TERMS_NOTES_MAX_LENGTH)],
  });
}

/** Invites a doctor, or proposes new terms to a linked one. Closes with `true` once the function accepts it. */
@Component({
  selector: 'app-terms-dialog',
  templateUrl: './terms-dialog.component.html',
  styleUrls: ['./terms-dialog.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslateModule,
  ],
})
export class TermsDialogComponent {
  readonly notesMaxLength = TERMS_NOTES_MAX_LENGTH;
  readonly isInvite: boolean;
  readonly doctorName: string;
  readonly form: ReturnType<typeof createForm>;
  sending = false;
  error = '';

  constructor(
    private dialogRef: MatDialogRef<TermsDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) private data: TermsDialogData,
    private clinicService: ClinicService,
    fb: FormBuilder,
  ) {
    this.isInvite = data.mode === 'invite';
    this.doctorName = data.mode === 'propose' ? data.doctorName : '';
    this.form = createForm(fb, data);
  }

  /** A secretary earns no share, so the commission is not asked. */
  get isSecretary(): boolean {
    return this.isInvite && this.form.controls.role.value === 'secretary';
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const terms: ClinicTerms = {
      commissionPercent: this.isSecretary ? 0 : value.commissionPercent,
      notes: value.notes.trim(),
    };
    this.sending = true;
    this.error = '';
    try {
      if (this.data.mode === 'invite') {
        await this.clinicService.inviteDoctor(value.email.trim(), terms, value.role);
      } else {
        await this.clinicService.proposeTerms(this.data.doctorId, terms);
      }
      this.dialogRef.close(true);
    } catch (err) {
      this.error = this.clinicService.errorMessage(err);
    } finally {
      this.sending = false;
    }
  }
}
