import { Component, OnInit } from '@angular/core';
import { DatePipe, NgClass, formatDate } from '@angular/common';
import { Direction } from '@angular/cdk/bidi';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { FirebaseAuthenticationService } from '@core';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { ClinicTermsComponent } from '@shared/components/clinic-terms/clinic-terms.component';
import { DeleteConfirmDialogService } from '@shared/components/delete-confirm-dialog/delete-confirm-dialog.service';
import { ClinicService } from '@core/service/clinic.service';
import { NotificationService } from '@core/service/notification.service';
import { getAppDateLocale } from '@core/util/app-locale.util';
import {
  ClinicAgreement,
  ClinicInvite,
  ClinicMembership,
  ClinicProfile,
  InviteStatus,
  LinkedDoctor,
  inviteDisplayStatus,
  isOpenInvite,
} from '@core/models/clinic.model';
import { TermsDialogComponent, TermsDialogData } from '../terms-dialog/terms-dialog.component';

const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_BADGES: Record<InviteStatus, string> = {
  pending: 'badge-solid-blue',
  accepted: 'badge-solid-green',
  declined: 'badge-solid-red',
  cancelled: 'badge-solid-brown',
  expired: 'badge-solid-orange',
};

/** The admin's doctors: linked doctors with their terms, and the invitations he sent. */
@Component({
  selector: 'app-clinic-doctors',
  templateUrl: './clinic-doctors.component.html',
  styleUrls: ['./clinic-doctors.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    ClinicTermsComponent,
    DatePipe,
    NgClass,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TranslateModule,
  ],
})
export class ClinicDoctorsComponent extends UnsubscribeOnDestroyAdapter implements OnInit {
  membership: ClinicMembership | null = null;
  clinic: ClinicProfile | null = null;
  doctors: LinkedDoctor[] = [];
  invites: ClinicInvite[] = [];
  busy = false;
  private agreements = new Map<string, ClinicAgreement>();

  constructor(
    private clinicService: ClinicService,
    private authService: FirebaseAuthenticationService,
    private dialog: MatDialog,
    private deleteConfirmDialog: DeleteConfirmDialogService,
    private notificationService: NotificationService,
    private translate: TranslateService,
  ) {
    super();
  }

  ngOnInit(): void {
    const adminId = this.authService.currentUserValue.id;
    this.subs.sink = this.clinicService.membership$.subscribe((membership) => (this.membership = membership));
    this.subs.sink = this.clinicService.clinicProfile$(adminId).subscribe((clinic) => (this.clinic = clinic));
    this.subs.sink = this.clinicService.linkedDoctors$(adminId).subscribe((doctors) => (this.doctors = doctors));
    this.subs.sink = this.clinicService.adminInvites$(adminId).subscribe((invites) => (this.invites = invites));
    this.subs.sink = this.clinicService.adminAgreements$(adminId).subscribe((agreements) => {
      this.agreements = new Map(agreements.map((agreement) => [agreement.id, agreement]));
    });
  }

  get dateLocale(): string {
    return getAppDateLocale(this.translate.currentLang);
  }

  /** Counted the way the functions count them: an open invitation holds a seat. */
  get openInviteCount(): number {
    const now = Date.now();
    return this.invites.filter((invite) => isOpenInvite(invite, now)).length;
  }

  get freeSeats(): number {
    return Math.max(0, (this.membership?.maxSeats ?? 0) - this.doctors.length - this.openInviteCount);
  }

  displayName(doctor: LinkedDoctor): string {
    return doctor.name || doctor.email;
  }

  currentAgreement(doctor: LinkedDoctor): ClinicAgreement | null {
    return (doctor.currentAgreementId && this.agreements.get(doctor.currentAgreementId)) || null;
  }

  proposal(doctor: LinkedDoctor): ClinicAgreement | null {
    const proposal = doctor.pendingAgreementId ? this.agreements.get(doctor.pendingAgreementId) : undefined;
    return proposal?.status === 'proposed' ? proposal : null;
  }

  /** Only the side that started an unlink can withdraw it, and only before it takes effect. */
  canWithdrawUnlink(doctor: LinkedDoctor): boolean {
    return doctor.unlinkRequestedBy === 'admin' && (doctor.unlinkEffectiveAt?.getTime() ?? 0) > Date.now();
  }

  inviteStatus(invite: ClinicInvite): InviteStatus {
    return inviteDisplayStatus(invite, Date.now());
  }

  statusBadge(invite: ClinicInvite): string {
    return STATUS_BADGES[this.inviteStatus(invite)];
  }

  statusLabel(invite: ClinicInvite): string {
    return `CLINIC.STATUS.${this.inviteStatus(invite).toUpperCase()}`;
  }

  /** Resend reopens a pending or expired invitation; answered and cancelled ones are closed for good. */
  isInviteOpenToChange(invite: ClinicInvite): boolean {
    return invite.status === 'pending' || invite.status === 'expired';
  }

  openInviteDialog(): void {
    this.openTermsDialog({ mode: 'invite' }, 'CLINIC.DOCTORS.MESSAGES.INVITED');
  }

  /** Starts from the open proposal when there is one, since that is what the admin last offered. */
  changeTerms(doctor: LinkedDoctor): void {
    const terms = (this.proposal(doctor) ?? this.currentAgreement(doctor))?.terms;
    if (!terms) {
      return;
    }
    this.openTermsDialog(
      { mode: 'propose', doctorId: doctor.doctorId, doctorName: this.displayName(doctor), terms },
      'CLINIC.DOCTORS.MESSAGES.TERMS_PROPOSED',
    );
  }

  async startUnlink(doctor: LinkedDoctor): Promise<void> {
    const noticeDays = this.currentAgreement(doctor)?.terms.noticeDays;
    if (noticeDays === undefined) {
      return;
    }
    const name = this.displayName(doctor);
    const message = noticeDays === 0
      ? this.translate.instant('CLINIC.DOCTORS.CONFIRM.START_UNLINK_IMMEDIATE', { name })
      : this.translate.instant('CLINIC.DOCTORS.CONFIRM.START_UNLINK', {
        name,
        date: this.formatDay(new Date(Date.now() + noticeDays * DAY_MS)),
      });
    if (!(await this.confirm(message, 'CLINIC.DOCTORS.ACTIONS.START_UNLINK'))) {
      return;
    }
    await this.run(async () => {
      const effectiveAt = await this.clinicService.requestUnlink(doctor.doctorId);
      return noticeDays === 0
        ? this.translate.instant('CLINIC.DOCTORS.MESSAGES.UNLINKED', { name })
        : this.translate.instant('CLINIC.DOCTORS.MESSAGES.UNLINK_STARTED', { date: this.formatDay(effectiveAt) });
    });
  }

  async withdrawUnlink(doctor: LinkedDoctor): Promise<void> {
    await this.run(async () => {
      await this.clinicService.cancelUnlink(doctor.doctorId);
      return this.translate.instant('CLINIC.DOCTORS.MESSAGES.UNLINK_WITHDRAWN');
    });
  }

  async unlinkNow(doctor: LinkedDoctor): Promise<void> {
    const name = this.displayName(doctor);
    const message = this.translate.instant('CLINIC.DOCTORS.CONFIRM.UNLINK_NOW', { name });
    if (!(await this.confirm(message, 'CLINIC.DOCTORS.ACTIONS.UNLINK_NOW'))) {
      return;
    }
    await this.run(async () => {
      await this.clinicService.completeUnlink(doctor.doctorId);
      return this.translate.instant('CLINIC.DOCTORS.MESSAGES.UNLINKED', { name });
    });
  }

  async resendInvite(invite: ClinicInvite): Promise<void> {
    await this.run(async () => {
      await this.clinicService.resendInvite(invite.id);
      return this.translate.instant('CLINIC.INVITES.MESSAGES.RESENT');
    });
  }

  async cancelInvite(invite: ClinicInvite): Promise<void> {
    const message = this.translate.instant('CLINIC.INVITES.CONFIRM_CANCEL', { email: invite.email });
    if (!(await this.confirm(message, 'CLINIC.INVITES.CANCEL'))) {
      return;
    }
    await this.run(async () => {
      await this.clinicService.cancelInvite(invite.id);
      return this.translate.instant('CLINIC.INVITES.MESSAGES.CANCELLED');
    });
  }

  private openTermsDialog(data: TermsDialogData, successKey: string): void {
    const dialogRef = this.dialog.open<TermsDialogComponent, TermsDialogData, boolean>(TermsDialogComponent, {
      data,
      direction: this.direction,
      width: '560px',
      maxWidth: '95vw',
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((done) => {
      if (done) {
        this.notifySuccess(this.translate.instant(successKey));
      }
    });
  }

  /** Runs one callable at a time; the action resolves to the success message. */
  private async run(action: () => Promise<string>): Promise<void> {
    this.busy = true;
    try {
      this.notifySuccess(await action());
    } catch (err) {
      this.notificationService.showSwalOkDialog(
        this.clinicService.errorMessage(err),
        'error',
        'center',
        this.translate.instant('COMMON.OK'),
      );
    } finally {
      this.busy = false;
    }
  }

  private async confirm(message: string, confirmLabel: string): Promise<boolean> {
    return (await firstValueFrom(this.deleteConfirmDialog.open(message, confirmLabel).afterClosed())) === 1;
  }

  private notifySuccess(message: string): void {
    this.notificationService.showSnackBarNotification('snackbar-success', message, 'bottom', 'center');
  }

  private formatDay(date: Date): string {
    return formatDate(date, 'mediumDate', this.dateLocale);
  }

  private get direction(): Direction {
    return localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';
  }
}
