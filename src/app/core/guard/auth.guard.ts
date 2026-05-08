import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { map } from 'rxjs/operators';



@Injectable({
  providedIn: 'root',
})

export class AuthGuard {
  constructor(
    private auth: AngularFireAuth,
    private router: Router,
  ) {}

  canActivate( route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.auth.authState.pipe(
      map(user => {
        if (!user) {
          this.router.navigate(['/authentication/signin']);
          return false;
        }

        if (!user.emailVerified) {
          this.router.navigate(['/authentication/verify-email']);
          return false;
        }

        return true;
      })
    );
  }
}

