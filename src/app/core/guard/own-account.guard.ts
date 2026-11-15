import { Injectable } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { ClinicContextService } from '@core/service/clinic-context.service';

/** The signed-in user's own profile, plan and clinic link are closed while he works in a doctor's account. */
@Injectable({
  providedIn: 'root',
})
export class OwnAccountGuard {
  constructor(
    private clinicContext: ClinicContextService,
    private router: Router,
  ) {}

  canActivate(): boolean | UrlTree {
    return !this.clinicContext.isActing || this.router.createUrlTree(['/admin/dashboard/main']);
  }
}
