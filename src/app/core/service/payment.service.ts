import { Injectable } from '@angular/core';
import {Observable, throwError} from "rxjs";
import {FirebaseAuthenticationService} from "../../authentication/services/firebase-authentication.service";
import { AngularFireFunctions } from '@angular/fire/compat/functions';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  constructor(
    private firebaseAuthenticationService: FirebaseAuthenticationService,
    private functions: AngularFireFunctions,
  ) { }

  public get doctor() {
    return this.firebaseAuthenticationService.currentUserValue
  }

  createCheckoutSession(priceId: string): Observable<{ sessionId: string; url: string }> {
    const doctor = this.doctor;
    if (!doctor?.id) {
      return throwError(() => new Error('You must be signed in to subscribe.'));
    }
    if (typeof priceId !== 'string' || !priceId.trim()) {
      return throwError(() => new Error('Invalid price selection.'));
    }
    const base = `${window.location.origin}${window.location.pathname}`;
    const successUrl = `${base}#/admin/doctors/doctor-plans`;
    const cancelUrl = successUrl;
    const callable = this.functions.httpsCallable('createCheckoutSession');
    return callable({
      doctorId: doctor.id,
      priceId: priceId.trim(),
      successUrl,
      cancelUrl,
    });
  }

  createBillingPortalSession(): Observable<{ url: string }> {
    const doctor = this.doctor;
    if (!doctor?.id) {
      return throwError(() => new Error('You must be signed in to manage billing.'));
    }
    const base = `${window.location.origin}${window.location.pathname}`;
    const returnUrl = `${base}#/admin/doctors/doctor-plans`;
    const callable = this.functions.httpsCallable('createBillingPortalSession');
    return callable({
      doctorId: doctor.id,
      returnUrl,
    });
  }

}
