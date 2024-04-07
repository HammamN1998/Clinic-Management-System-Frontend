import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {FirebaseAuthenticationService} from "../../authentication/services/firebase-authentication.service";



@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  constructor(private firebaseAuthenticationService: FirebaseAuthenticationService, private router: Router) { }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    if (this.firebaseAuthenticationService.currentUserValue) {
      const userRole = this.firebaseAuthenticationService.currentUserValue.role;
      if (route.data['role'] && route.data['role'].indexOf(userRole) === -1) {
        this.router.navigate(['/authentication/signin']);
        return false;
      }
      return true;
    }

    this.router.navigate(['/authentication/signin']);
    return false;
  }
}
