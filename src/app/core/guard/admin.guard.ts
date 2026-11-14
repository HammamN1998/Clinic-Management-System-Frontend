import { Injectable } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { ClinicService } from '@core/service/clinic.service';

/** Clinic pages are for clinic admins only; anyone else lands on the dashboard. */
@Injectable({
  providedIn: 'root',
})
export class AdminGuard {
  constructor(
    private clinicService: ClinicService,
    private router: Router,
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.clinicService.membership$.pipe(
      take(1),
      map((membership) => membership?.isAdmin === true || this.router.createUrlTree(['/admin/dashboard/main'])),
    );
  }
}
