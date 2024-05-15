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
    private auth: AngularFireAuth
  ) {}

  canActivate( route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.auth.authState.pipe(
      map(user => {
        return !!user;  // Return true if user is logged in, false otherwise
      })
    );
  }
}

// export class AuthGuard {
//   constructor(private firebaseAuthenticationService: FirebaseAuthenticationService, private router: Router) { }
//
//   // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
//     if (this.firebaseAuthenticationService.currentUserValue) {
//       const userRole = this.firebaseAuthenticationService.currentUserValue.role;
//       if (route.data['role'] && route.data['role'].indexOf(userRole) === -1) {
//         this.router.navigate(['/authentication/signin']);
//         return false;
//       }
//       return true;
//     }
//
//     this.router.navigate(['/authentication/signin']);
//     return false;
//   }
// }
