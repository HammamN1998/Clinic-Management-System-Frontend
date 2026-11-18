import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { FirebaseAuthenticationService } from '@core';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { ClinicService } from '@core/service/clinic.service';
import { ClinicAgreement, ClinicInvite, LinkedDoctor, inviteDisplayStatus } from '@core/models/clinic.model';

/** One line of Needs attention, translated in the template. */
interface AttentionItem {
  icon: string;
  key: string;
  params: Record<string, string>;
}

/** What needs the clinic admin: new terms his doctors have not answered, and invitations that expired. */
@Component({
  selector: 'app-clinic-dashboard',
  templateUrl: './clinic-dashboard.component.html',
  styleUrls: ['./clinic-dashboard.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent, MatIconModule, RouterLink, TranslateModule],
})
export class ClinicDashboardComponent extends UnsubscribeOnDestroyAdapter implements OnInit {
  private linked: LinkedDoctor[] = [];
  private agreements = new Map<string, ClinicAgreement>();
  private invites: ClinicInvite[] = [];

  constructor(
    private clinicService: ClinicService,
    private authService: FirebaseAuthenticationService,
  ) {
    super();
  }

  ngOnInit(): void {
    const adminId = this.authService.currentUserValue.id;
    this.subs.sink = this.clinicService.linkedDoctors$(adminId).subscribe((linked) => (this.linked = linked));
    this.subs.sink = this.clinicService.adminInvites$(adminId).subscribe((invites) => (this.invites = invites));
    this.subs.sink = this.clinicService.adminAgreements$(adminId).subscribe((agreements) => {
      this.agreements = new Map(agreements.map((agreement) => [agreement.id, agreement]));
    });
  }

  /** Each item is handled on Clinic > Doctors. */
  get attentionItems(): AttentionItem[] {
    const items: AttentionItem[] = [];
    for (const doctor of this.linked) {
      const proposal = doctor.pendingAgreementId ? this.agreements.get(doctor.pendingAgreementId) : undefined;
      if (proposal?.status === 'proposed') {
        items.push({ icon: 'edit_note', key: 'CLINIC.DASHBOARD.ATTENTION.PROPOSAL', params: { doctor: doctor.name || doctor.email } });
      }
    }
    const now = Date.now();
    // Invites come newest first. Only each doctor's newest one counts, and none once he joined.
    const seen = new Set(this.linked.map((doctor) => doctor.doctorId));
    for (const invite of this.invites) {
      if (seen.has(invite.doctorId)) {
        continue;
      }
      seen.add(invite.doctorId);
      if (inviteDisplayStatus(invite, now) === 'expired') {
        items.push({ icon: 'mail_outline', key: 'CLINIC.DASHBOARD.ATTENTION.INVITE_EXPIRED', params: { name: invite.doctorName || invite.email } });
      }
    }
    return items;
  }
}
