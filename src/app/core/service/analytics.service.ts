import { Injectable } from '@angular/core';
import { AngularFireAnalytics } from '@angular/fire/compat/analytics';

/**
 * Thin wrapper around Firebase Analytics that emits the product activation
 * funnel events referenced by the ClinicWell go-to-market plan:
 * signup -> email verified -> profile completed -> first patient ->
 * first appointment -> onboarding completed -> checkout started.
 *
 * Logging must never interrupt a clinical workflow, so every call is guarded.
 * Only non-personal data is ever sent (booleans, plan/price identifiers); no
 * patient or doctor PII is included in any event payload. Doctor identity is
 * attached via {@link setDoctorUserId} using the opaque Firebase Auth UID.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor(private readonly analytics: AngularFireAnalytics) {}

  private log(eventName: string, params: Record<string, unknown> = {}): void {
    try {
      void this.analytics.logEvent(eventName, params);
    } catch (error) {
      console.warn('[analytics] failed to log event', eventName, error);
    }
  }

  /** Attach all subsequent events to this doctor (Firebase Auth UID). */
  setDoctorUserId(doctorId: string): void {
    try {
      void this.analytics.setUserId(doctorId);
    } catch (error) {
      console.warn('[analytics] failed to set user id', error);
    }
  }

  /** Clear the analytics user id on logout. */
  clearDoctorUserId(): void {
    try {
      void (this.analytics as AngularFireAnalytics & { setUserId(id: string | null): Promise<void> })
        .setUserId(null);
    } catch (error) {
      console.warn('[analytics] failed to clear user id', error);
    }
  }

  /** Fire an event at most once per doctor on this browser. */
  private oncePerDoctor(doctorId: string, suffix: string, emit: () => void): void {
    if (!doctorId) {
      return;
    }
    const key = `cw_analytics_${suffix}_${doctorId}`;
    try {
      if (localStorage.getItem(key) === '1') {
        return;
      }
      localStorage.setItem(key, '1');
    } catch {
      return;
    }
    emit();
  }

  signupComplete(): void {
    this.log('signup_complete');
  }

  emailVerified(doctorId: string): void {
    this.oncePerDoctor(doctorId, 'email_verified', () => {
      this.log('email_verified');
    });
  }

  profileCompleted(doctorId: string): void {
    this.oncePerDoctor(doctorId, 'profile_completed', () => {
      this.log('profile_completed');
    });
  }

  patientAdded(isFirst: boolean): void {
    this.log('patient_added', { first: isFirst });
    if (isFirst) {
      this.log('first_patient_added');
    }
  }

  appointmentCreated(isFirst: boolean): void {
    this.log('appointment_created', { first: isFirst });
    if (isFirst) {
      this.log('first_appointment_created');
    }
  }

  onboardingCompleted(doctorId: string): void {
    this.oncePerDoctor(doctorId, 'onboarding_completed', () => {
      this.log('onboarding_completed');
    });
  }

  onboardingRemindLater(): void {
    this.log('onboarding_remind_later');
  }

  onboardingDismissPermanent(): void {
    this.log('onboarding_dismiss_permanent');
  }

  checkoutStarted(priceId?: string): void {
    this.log('checkout_started', { price_id: priceId ?? 'unknown' });
  }

  billingPortalOpened(source: 'doctor_plans' | 'header' = 'doctor_plans'): void {
    this.log('billing_portal_opened', { source });
  }
}
