import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TranslateModule } from '@ngx-translate/core';
import { ClinicTermsComponent } from '@shared/components/clinic-terms/clinic-terms.component';
import { ClinicService } from '@core/service/clinic.service';
import { ClinicInvite } from '@core/models/clinic.model';

export interface InviteConsentData {
  invite: ClinicInvite;
  clinicName: string;
  adminName: string;
  /** The doctor has a paid plan of his own, which joining does not cancel. */
  paysOwnPlan: boolean;
}

/** What joining a clinic means, and the doctor's explicit agreement before he joins. Closes with `true` once joined. */
@Component({
  selector: 'app-invite-consent-dialog',
  templateUrl: './invite-consent-dialog.component.html',
  styleUrls: ['./invite-consent-dialog.component.scss'],
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButtonModule,
    MatCheckboxModule,
    ClinicTermsComponent,
    TranslateModule,
  ],
})
export class InviteConsentDialogComponent {
  agreed = false;
  sending = false;
  error = '';

  constructor(
    private dialogRef: MatDialogRef<InviteConsentDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: InviteConsentData,
    private clinicService: ClinicService,
  ) {}

  async join(): Promise<void> {
    if (!this.agreed || this.sending) {
      return;
    }
    this.sending = true;
    this.error = '';
    try {
      await this.clinicService.respondToInvite(this.data.invite.id, true);
      this.dialogRef.close(true);
    } catch (err) {
      this.error = this.clinicService.errorMessage(err);
    } finally {
      this.sending = false;
    }
  }
}
