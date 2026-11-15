import { Component, OnInit } from '@angular/core';
import { DatePipe, formatDate } from '@angular/common';
import { Direction } from '@angular/cdk/bidi';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { combineLatest, firstValueFrom } from 'rxjs';
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
  PatientDeletionRequest,
} from '@core/models/clinic.model';
import {
  RecordHistoryDialogComponent,
  RecordHistoryDialogData,
} from '@shared/components/record-history-dialog/record-history-dialog.component';
import {
  InviteConsentData,
  InviteConsentDialogComponent,
} from './invite-consent-dialog/invite-consent-dialog.component';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The signed-in doctor's side of a clinic: invitations to answer, or his membership and its terms. */
@Component({
  selector: 'app-my-clinic',
  templateUrl: './my-clinic.component.html',
  styleUrls: ['./my-clinic.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    ClinicTermsComponent,
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
  ],
})
export class MyClinicComponent extends UnsubscribeOnDestroyAdapter implements OnInit {
  membership: ClinicMembership | null = null;
  invites: ClinicInvite[] = [];
  clinic: ClinicProfile | null = null;
  currentAgreement: ClinicAgreement | null = null;
  pendingAgreement: ClinicAgreement | null = null;
  deletionRequests: PatientDeletionRequest[] = [];
  hasPastHistory = false;
  loaded = false;
  busy = false;

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
    this.subs.sink = combineLatest([this.clinicService.membership$, this.clinicService.pendingInvites$]).subscribe(
      ([membership, invites]) => {
        this.membership = membership;
        this.invites = invites;
        this.loaded = true;
      },
    );
    this.subs.sink = this.clinicService.clinic$.subscribe((clinic) => (this.clinic = clinic));
    this.subs.sink = this.clinicService.currentAgreement$.subscribe((agreement) => (this.currentAgreement = agreement));
    this.subs.sink = this.clinicService.pendingAgreement$.subscribe((agreement) => (this.pendingAgreement = agreement));
    this.subs.sink = this.clinicService.deletionRequests$.subscribe((requests) => (this.deletionRequests = requests));
    this.subs.sink = this.clinicService.pastHistory$.subscribe((has) => (this.hasPastHistory = has));
  }

  get dateLocale(): string {
    return getAppDateLocale(this.translate.currentLang);
  }

  get clinicName(): string {
    return this.clinic?.name || this.translate.instant('CLINIC.UNNAMED_CLINIC');
  }

  get proposal(): ClinicAgreement | null {
    return this.pendingAgreement?.status === 'proposed' ? this.pendingAgreement : null;
  }

  /** Only the side that started an unlink can withdraw it, and only before it takes effect. */
  get canWithdrawLeave(): boolean {
    return (
      this.membership?.unlinkRequestedBy === 'doctor' && (this.membership.unlinkEffectiveAt?.getTime() ?? 0) > Date.now()
    );
  }

  inviteClinicName(invite: ClinicInvite): string {
    return invite.clinicName || this.translate.instant('CLINIC.UNNAMED_CLINIC');
  }

  inviteAdminName(invite: ClinicInvite): string {
    return invite.adminName || this.translate.instant('CLINIC.SOMEONE');
  }

  reviewInvite(invite: ClinicInvite): void {
    const plan = this.authService.currentUserValue.subscription?.plan;
    const clinicName = this.inviteClinicName(invite);
    const dialogRef = this.dialog.open<InviteConsentDialogComponent, InviteConsentData, boolean>(
      InviteConsentDialogComponent,
      {
        data: { invite, clinicName, adminName: this.inviteAdminName(invite), paysOwnPlan: !!plan && plan !== 'free' },
        direction: this.direction,
        width: '640px',
        maxWidth: '95vw',
        maxHeight: '90vh',
      },
    );
    this.subs.sink = dialogRef.afterClosed().subscribe((joined) => {
      if (joined) {
        this.notifySuccess(this.translate.instant('CLINIC.MY_CLINIC.MESSAGES.JOINED', { clinic: clinicName }));
      }
    });
  }

  async declineInvite(invite: ClinicInvite): Promise<void> {
    const message = this.translate.instant('CLINIC.MY_CLINIC.CONFIRM.DECLINE_INVITE', {
      clinic: this.inviteClinicName(invite),
    });
    if (!(await this.confirm(message, 'CLINIC.MY_CLINIC.DECLINE'))) {
      return;
    }
    await this.run(async () => {
      await this.clinicService.respondToInvite(invite.id, false);
      return this.translate.instant('CLINIC.MY_CLINIC.MESSAGES.INVITE_DECLINED');
    });
  }

  async acceptTerms(proposal: ClinicAgreement): Promise<void> {
    await this.run(async () => {
      await this.clinicService.respondToTerms(proposal.id, true);
      return this.translate.instant('CLINIC.MY_CLINIC.MESSAGES.TERMS_ACCEPTED');
    });
  }

  async declineTerms(proposal: ClinicAgreement): Promise<void> {
    const message = this.translate.instant('CLINIC.MY_CLINIC.CONFIRM.DECLINE_TERMS');
    if (!(await this.confirm(message, 'CLINIC.MY_CLINIC.DECLINE'))) {
      return;
    }
    await this.run(async () => {
      await this.clinicService.respondToTerms(proposal.id, false);
      return this.translate.instant('CLINIC.MY_CLINIC.MESSAGES.TERMS_DECLINED');
    });
  }

  async leave(agreement: ClinicAgreement): Promise<void> {
    const clinic = this.clinicName;
    const noticeDays = agreement.terms.noticeDays;
    const message = noticeDays === 0
      ? this.translate.instant('CLINIC.MY_CLINIC.CONFIRM.LEAVE_IMMEDIATE', { clinic })
      : this.translate.instant('CLINIC.MY_CLINIC.CONFIRM.LEAVE', {
        clinic,
        date: this.formatDay(new Date(Date.now() + noticeDays * DAY_MS)),
      });
    if (!(await this.confirm(message, 'CLINIC.MY_CLINIC.LEAVE'))) {
      return;
    }
    await this.run(async () => {
      const effectiveAt = await this.clinicService.requestUnlink();
      return noticeDays === 0
        ? this.translate.instant('CLINIC.MY_CLINIC.MESSAGES.LEFT', { clinic })
        : this.translate.instant('CLINIC.MY_CLINIC.MESSAGES.LEAVE_STARTED', { date: this.formatDay(effectiveAt) });
    });
  }

  async withdrawLeave(): Promise<void> {
    await this.run(async () => {
      await this.clinicService.cancelUnlink();
      return this.translate.instant('CLINIC.MY_CLINIC.MESSAGES.LEAVE_WITHDRAWN');
    });
  }

  /** Withdraws a pending request, or dismisses a rejected one. */
  async clearDeletionRequest(request: PatientDeletionRequest): Promise<void> {
    const pending = request.status === 'pending';
    await this.run(async () => {
      await this.clinicService.cancelPatientDeletion(request.patientId);
      return this.translate.instant(pending ? 'CLINIC.DELETION.MESSAGES.WITHDRAWN' : 'CLINIC.DELETION.MESSAGES.DISMISSED');
    });
  }

  openHistory(): void {
    const membership = this.membership;
    if (!membership) {
      return;
    }
    const names: Record<string, string> = { [membership.doctorId]: this.translate.instant('CLINIC.HISTORY.YOU') };
    if (membership.clinicAdminId && this.clinic?.adminName) {
      names[membership.clinicAdminId] = this.clinic.adminName;
    }
    this.dialog.open<RecordHistoryDialogComponent, RecordHistoryDialogData>(RecordHistoryDialogComponent, {
      data: {
        title: this.translate.instant('CLINIC.HISTORY.TITLE'),
        hint: this.translate.instant('CLINIC.HISTORY.MY_HINT'),
        doctorId: membership.doctorId,
        adminId: null,
        canRestore: true,
        names,
        otherName: this.translate.instant('CLINIC.SOMEONE'),
      },
      direction: this.direction,
      width: '760px',
      maxWidth: '95vw',
      maxHeight: '90vh',
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
