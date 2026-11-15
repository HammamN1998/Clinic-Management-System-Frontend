import { Injectable } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { ClinicContextService } from '@core/service/clinic-context.service';

/** Pages that only add or change records are closed inside a doctor's account opened with view access. */
@Injectable({
  providedIn: 'root',
})
export class EditAccessGuard {
  constructor(
    private clinicContext: ClinicContextService,
    private router: Router,
  ) {}

  canActivate(): boolean | UrlTree {
    return this.clinicContext.canEdit || this.router.createUrlTree(['/admin/patients/all-patients']);
  }
}
