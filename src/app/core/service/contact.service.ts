import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { FirebaseAuthenticationService } from '../../authentication/services/firebase-authentication.service';

export interface ContactRequestPayload {
  category: string;
  subject: string;
  description: string;
}

/**
 * Sends a support request through the authenticated `submitContactForm` callable
 * (region `europe-west1`, see PaymentService). The callable reads the doctor's
 * name/email from `context.auth`, so only `{ category, subject, description }` is
 * sent from the client. It emails the support inbox and a confirmation to the doctor.
 */
@Injectable({
  providedIn: 'root',
})
export class ContactService {
  constructor(
    private firebaseAuthenticationService: FirebaseAuthenticationService,
    private functions: AngularFireFunctions,
  ) {}

  submitRequest(payload: ContactRequestPayload): Observable<{ message: string }> {
    if (!this.firebaseAuthenticationService.currentUserValue?.id) {
      return throwError(() => new Error('You must be signed in to contact support.'));
    }

    const category = String(payload.category ?? '').trim();
    const subject = String(payload.subject ?? '').trim();
    const description = String(payload.description ?? '').trim();

    if (!category || !subject || !description) {
      return throwError(() => new Error('Please complete all fields.'));
    }

    const callable = this.functions.httpsCallable<ContactRequestPayload, { message: string }>(
      'submitContactForm',
    );
    return callable({ category, subject, description });
  }
}
