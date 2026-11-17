import { Component, Inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogState,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { FirebaseAuthenticationService } from '@core';
import { ClinicService } from '@core/service/clinic.service';
import { CurrencyService } from '@core/service/currency.service';
import { getAppDateLocale } from '@core/util/app-locale.util';
import { isSupportedCurrency } from '@core/util/currency.util';
import { COPY_BATCH_SIZE, CopyResult, LinkedDoctor } from '@core/models/clinic.model';

export interface CopyDialogData {
  doctor: LinkedDoctor;
  /** The admin's linked doctors, among them those who can receive the copies. */
  doctors: LinkedDoctor[];
  /** Opened before an unlink that takes effect at once, which the dialog can go on to. */
  beforeUnlink: boolean;
}

/** `unlink` when the admin goes on to unlink the doctor. */
export type CopyDialogResult = 'unlink';

interface CopyTarget {
  id: string;
  name: string;
  /** What its amounts are in. */
  currency: string;
}

const NOTHING_COPIED: CopyResult = { copied: 0, alreadyCopied: 0, notEligible: 0 };

/**
 * Copies the patients a linked doctor added since he joined into the admin's account, or into
 * that of a doctor who gave him edit access and is not leaving, a few per call. Closing it stops
 * after the call under way; copying again skips the patients already copied there.
 */
@Component({
  selector: 'app-copy-dialog',
  templateUrl: './copy-dialog.component.html',
  styleUrls: ['./copy-dialog.component.scss'],
  standalone: true,
  imports: [
    DatePipe,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatSelectModule,
    TranslateModule,
  ],
})
export class CopyDialogComponent {
  readonly doctorName: string;
  readonly linkedAt: Date | null;
  readonly beforeUnlink: boolean;
  readonly doctorCurrency: string;
  readonly targets: CopyTarget[];
  targetId: string;
  /** Null until the function lists them. */
  patientIds: string[] | null = null;
  /** How many of them the calls so far took, into the chosen account. */
  sent = 0;
  result: CopyResult = NOTHING_COPIED;
  copying = false;
  error = '';
  private readonly adminId: string;
  private copiedToOwnAccount = false;
  /** The copies being sent, whose call under way goes on after the dialog closes. */
  private run: Promise<void> = Promise.resolve();

  constructor(
    private dialogRef: MatDialogRef<CopyDialogComponent, CopyDialogResult>,
    @Inject(MAT_DIALOG_DATA) private data: CopyDialogData,
    private clinicService: ClinicService,
    private translate: TranslateService,
    authService: FirebaseAuthenticationService,
    currencyService: CurrencyService,
  ) {
    const { doctor } = data;
    const admin = authService.currentUserValue;
    // As the clinic dashboard reads them: a doctor who picked no currency counts as using the admin's.
    const currencyOf = (code: string | undefined) => (isSupportedCurrency(code) ? code : currencyService.code);
    this.doctorName = doctor.name || doctor.email;
    this.linkedAt = doctor.linkedAt;
    this.beforeUnlink = data.beforeUnlink;
    this.doctorCurrency = currencyOf(doctor.currency);
    this.adminId = admin.id;
    this.targets = [
      {
        id: admin.id,
        name: translate.instant('CLINIC.SELF_NAME', { name: admin.name || admin.email }),
        currency: currencyService.code,
      },
      ...data.doctors
        .filter((other) => other.doctorId !== doctor.doctorId && other.clinicAccess === 'edit' && !other.unlinkEffectiveAt)
        .map((other) => ({ id: other.doctorId, name: other.name || other.email, currency: currencyOf(other.currency) })),
    ];
    this.targetId = admin.id;
    void this.list();
    void this.reloadCountsOnClose();
  }

  get dateLocale(): string {
    return getAppDateLocale(this.translate.currentLang);
  }

  get total(): number {
    return this.patientIds?.length ?? 0;
  }

  get percent(): number {
    return this.total ? (100 * this.sent) / this.total : 0;
  }

  get finished(): boolean {
    return this.total > 0 && this.sent === this.total;
  }

  get toOwnAccount(): boolean {
    return this.targetId === this.adminId;
  }

  /** The chosen account's currency when it differs from the doctor's: amounts are copied without conversion. */
  get otherCurrency(): string | null {
    const currency = this.targets.find((target) => target.id === this.targetId)?.currency;
    return currency && currency !== this.doctorCurrency ? currency : null;
  }

  /** What was copied counts for the account it went to, so another account starts over. */
  onTargetChange(): void {
    this.sent = 0;
    this.result = NOTHING_COPIED;
    this.error = '';
  }

  copy(): void {
    if (this.patientIds && !this.copying) {
      this.run = this.send(this.patientIds);
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  unlink(): void {
    this.dialogRef.close('unlink');
  }

  /** Sends the patients not sent yet, a batch per call, until all are sent, a call fails, or the dialog closes. */
  private async send(patientIds: string[]): Promise<void> {
    const targetId = this.targetId;
    this.copiedToOwnAccount ||= targetId === this.adminId;
    this.copying = true;
    this.error = '';
    try {
      // Closing starts with an animation, before the component is destroyed, so the dialog's state tells it first.
      while (this.sent < patientIds.length && this.dialogRef.getState() === MatDialogState.OPEN) {
        const batch = patientIds.slice(this.sent, this.sent + COPY_BATCH_SIZE);
        const result = await this.clinicService.copyPatients(this.data.doctor.doctorId, targetId, batch);
        this.result = {
          copied: this.result.copied + result.copied,
          alreadyCopied: this.result.alreadyCopied + result.alreadyCopied,
          notEligible: this.result.notEligible + result.notEligible,
        };
        this.sent += batch.length;
      }
    } catch (err) {
      this.error = this.clinicService.errorMessage(err);
    } finally {
      this.copying = false;
    }
  }

  private async list(): Promise<void> {
    try {
      this.patientIds = await this.clinicService.copyablePatients(this.data.doctor.doctorId);
    } catch (err) {
      this.error = this.clinicService.errorMessage(err);
    }
  }

  /**
   * The app keeps the counts of its own account, which copies there change, so they are read back
   * once the dialog has closed and the call under way, if any, has written its copies.
   */
  private async reloadCountsOnClose(): Promise<void> {
    await firstValueFrom(this.dialogRef.afterClosed());
    await this.run;
    if (this.copiedToOwnAccount) {
      await this.clinicService.reloadOwnCounts();
    }
  }
}
