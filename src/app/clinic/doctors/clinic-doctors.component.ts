import { Component, OnInit } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { Direction } from '@angular/cdk/bidi';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
  ClinicBrand,
  ClinicDoctor,
  ClinicInvite,
  ClinicMembership,
  ClinicProfile,
  InviteStatus,
  LinkedDoctor,
  SECRETARY_SECTIONS,
  SecretarySection,
  inviteDisplayStatus,
  isOpenInvite,
} from '@core/models/clinic.model';
import {
  RecordHistoryDialogComponent,
  RecordHistoryDialogData,
} from '@shared/components/record-history-dialog/record-history-dialog.component';
import { TermsDialogComponent, TermsDialogData } from '../terms-dialog/terms-dialog.component';
import { BrandingDialogComponent } from '../branding-dialog/branding-dialog.component';

const STATUS_BADGES: Record<InviteStatus, string> = {
  pending: 'badge-solid-blue',
  accepted: 'badge-solid-green',
  declined: 'badge-solid-red',
  cancelled: 'badge-solid-brown',
  expired: 'badge-solid-orange',
};

/** The admin's doctors: linked doctors with their terms, the invitations he sent, and the clinic account's history. */
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
    MatCheckboxModule,
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
  /** Everyone who works or worked in the clinic, the admin included, as its history names them. */
  clinicDoctors: ClinicDoctor[] = [];
  busy = false;
  readonly secretarySections = SECRETARY_SECTIONS;
  /** What the admin hides from his secretary in patient profiles. */
  secretaryHidden: string[] = [];
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
    this.subs.sink = this.clinicService.clinicDoctors$(adminId).subscribe((doctors) => (this.clinicDoctors = doctors));
    this.subs.sink = this.clinicService.adminInvites$(adminId).subscribe((invites) => (this.invites = invites));
    this.clinicService.ownSecretaryHidden().then(
      (hidden) => (this.secretaryHidden = hidden),
      (err) => console.error('Failed to read the secretary settings', err),
    );
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

  async editBranding(): Promise<void> {
    this.busy = true;
    const brand = await this.clinicService.ownBrand().catch((err) => {
      console.error('Failed to read the clinic name and logo', err);
      return null;
    });
    this.busy = false;
    if (!brand) {
      this.notificationService.showSwalOkDialog(
        this.translate.instant('CLINIC.BRANDING.LOAD_FAILED'),
        'error',
        'center',
        this.translate.instant('COMMON.OK'),
      );
      return;
    }
    const dialogRef = this.dialog.open<BrandingDialogComponent, ClinicBrand, boolean>(BrandingDialogComponent, {
      data: brand,
      direction: this.direction,
      width: '520px',
      maxWidth: '95vw',
      // Closed only through its buttons, which wait for an upload or a save to finish, so the
      // dialog can delete a logo uploaded but not saved.
      disableClose: true,
      closeOnNavigation: false,
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((saved) => {
      if (saved) {
        this.notifySuccess(this.translate.instant('CLINIC.BRANDING.SAVED'));
      }
    });
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

  async unlink(doctor: LinkedDoctor): Promise<void> {
    const name = this.displayName(doctor);
    const message = this.translate.instant('CLINIC.DOCTORS.CONFIRM.UNLINK', { name });
    if (!(await this.confirm(message, 'CLINIC.DOCTORS.ACTIONS.UNLINK'))) {
      return;
    }
    await this.run(async () => {
      await this.clinicService.unlink(doctor.doctorId);
      return this.translate.instant('CLINIC.DOCTORS.MESSAGES.UNLINKED', { name });
    });
  }

  openHistory(): void {
    const adminId = this.authService.currentUserValue.id;
    this.dialog.open<RecordHistoryDialogComponent, RecordHistoryDialogData>(RecordHistoryDialogComponent, {
      data: {
        title: this.translate.instant('CLINIC.HISTORY.TITLE'),
        hint: this.translate.instant('CLINIC.HISTORY.ADMIN_HINT'),
        accountId: adminId,
        doctors: this.clinicDoctors.map((doctor) => ({
          id: doctor.doctorId,
          name: doctor.doctorId === adminId
            ? this.translate.instant('CLINIC.SELF_NAME', { name: doctor.name })
            : doctor.name,
        })),
        otherName: this.translate.instant('CLINIC.HISTORY.UNKNOWN'),
      },
      direction: this.direction,
      width: '760px',
      maxWidth: '95vw',
      maxHeight: '90vh',
    });
  }

  isHiddenFromSecretary(section: SecretarySection): boolean {
    return this.secretaryHidden.includes(section);
  }

  async hideFromSecretary(section: SecretarySection, hide: boolean): Promise<void> {
    const before = this.secretaryHidden;
    this.secretaryHidden = hide ? [...before, section] : before.filter((hidden) => hidden !== section);
    try {
      await this.clinicService.saveSecretaryHidden(this.secretaryHidden);
    } catch (err) {
      console.error('Failed to save the secretary settings', err);
      this.secretaryHidden = before;
      this.notificationService.showSwalOkDialog(
        this.translate.instant('CLINIC.SECRETARY.SAVE_FAILED'),
        'error',
        'center',
        this.translate.instant('COMMON.OK'),
      );
    }
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

  private get direction(): Direction {
    return localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';
  }
}
