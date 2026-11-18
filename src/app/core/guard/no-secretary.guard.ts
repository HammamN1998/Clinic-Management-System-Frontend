import { Injectable } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { ClinicService } from '@core/service/clinic.service';

/** A secretary has no dashboard; his first page is the appointments calendar. */
@Injectable({
  providedIn: 'root',
})
export class NoSecretaryGuard {
  constructor(
    private clinicService: ClinicService,
    private router: Router,
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.clinicService.membership$.pipe(
      take(1),
      map((membership) => membership?.isSecretary !== true || this.router.createUrlTree(['/calendar'])),
    );
  }
}
