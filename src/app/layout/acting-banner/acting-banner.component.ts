import { Component, Inject, OnDestroy, Renderer2 } from '@angular/core';
import { DOCUMENT, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { ActingContext, ClinicContextService } from '@core/service/clinic-context.service';

/** Shown under the header while a clinic admin works in one of his doctors' accounts. */
@Component({
  selector: 'app-acting-banner',
  templateUrl: './acting-banner.component.html',
  styleUrls: ['./acting-banner.component.scss'],
  standalone: true,
  imports: [NgIf, MatButtonModule, MatIconModule, TranslateModule],
})
export class ActingBannerComponent extends UnsubscribeOnDestroyAdapter implements OnDestroy {
  acting: ActingContext | null = null;

  constructor(
    private clinicContext: ClinicContextService,
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
  }

  get doctorName(): string {
    return this.acting?.doctor.name || this.acting?.doctor.email || '';
  }

  backToMyAccount(): void {
    this.clinicContext.clear();
    void this.router.navigate(['/clinic/doctors']);
  }

  override ngOnDestroy(): void {
    this.renderer.removeClass(this.document.body, 'acting-mode');
    super.ngOnDestroy();
  }
}
