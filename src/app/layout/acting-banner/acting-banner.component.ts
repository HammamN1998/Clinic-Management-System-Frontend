import { Component, Inject, OnDestroy, Renderer2 } from '@angular/core';
import { DOCUMENT, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { ActingContext, ClinicContextService } from '@core/service/clinic-context.service';
import { ClinicService } from '@core/service/clinic.service';

/** Shown under the header while a linked doctor works in his clinic's account. */
@Component({
  selector: 'app-acting-banner',
  templateUrl: './acting-banner.component.html',
  styleUrls: ['./acting-banner.component.scss'],
  standalone: true,
  imports: [NgIf, MatButtonModule, MatIconModule, TranslateModule],
})
export class ActingBannerComponent extends UnsubscribeOnDestroyAdapter implements OnDestroy {
  acting: ActingContext | null = null;
  /** A secretary has no account of his own to go back to. */
  secretary = false;
  private clinicName = '';

  constructor(
    private clinicContext: ClinicContextService,
    clinicService: ClinicService,
    private router: Router,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
  ) {
    super();
    this.subs.sink = this.clinicContext.acting$.subscribe((acting) => {
      this.acting = acting;
      // The body class moves the sidebar and the page down to make room for the banner.
      if (acting) {
        this.renderer.addClass(this.document.body, 'acting-mode');
      } else {
        this.renderer.removeClass(this.document.body, 'acting-mode');
      }
    });
    this.subs.sink = clinicService.membership$.subscribe((membership) => (this.secretary = membership?.isSecretary === true));
    this.subs.sink = clinicService.clinic$.subscribe((clinic) => (this.clinicName = clinic?.name ?? ''));
  }

  /** The clinic's name, or its admin's until the clinic profile is read. */
  get name(): string {
    return this.clinicName || this.acting?.doctor.name || this.acting?.doctor.email || '';
  }

  toMyAccount(): void {
    this.clinicContext.chooseOwnAccount();
    void this.router.navigate(['/admin/dashboard/main']);
  }

  override ngOnDestroy(): void {
    this.renderer.removeClass(this.document.body, 'acting-mode');
    super.ngOnDestroy();
  }
}
