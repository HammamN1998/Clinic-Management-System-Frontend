import { Injectable } from '@angular/core';
import {Router, ActivatedRouteSnapshot, RouterStateSnapshot, CanActivate} from '@angular/router';
import {FirebaseAuthenticationService} from "../../authentication/services/firebase-authentication.service";
import {AngularFireAuth} from "@angular/fire/compat/auth";
import {map} from "rxjs/operators";



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
        if (user) {
          return true;
        } else {
          this.router.navigate(['/authentication/signin']);
          return false;
        }
      })
    );
  }
}

