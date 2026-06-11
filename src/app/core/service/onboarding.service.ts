import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FirebaseAuthenticationService } from '../../authentication/services/firebase-authentication.service';
import { AnalyticsService } from './analytics.service';

/**
 * Snapshot of a clinic's first-run progress used to drive the dashboard
 * onboarding checklist.
 */
export interface OnboardingStatus {
  profileCompleted: boolean;
  patientAdded: boolean;
  appointmentCreated: boolean;
  completedCount: number;
  totalSteps: number;
  allComplete: boolean;
  dismissed: boolean;
}

/**
 * Tracks the three activation milestones a new clinic should reach
 * (profile + logo, first patient, first appointment) and forwards the
 * matching analytics events.
 *
 * Progress and dismiss preferences are kept in localStorage keyed per doctor.
 * This intentionally avoids new Firestore writes (and any security-rule changes)
 * for what is only a UI nudge; activation is still measured server-side via the
 * analytics events and existing Firestore data.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly totalSteps = 3;
  /** Days to hide the checklist after "Remind me later". */
  private readonly remindLaterDays = 7;
  private readonly msPerDay = 24 * 60 * 60 * 1000;

  constructor(
    private readonly auth: FirebaseAuthenticationService,
    private readonly firestore: AngularFirestore,
    private readonly analytics: AnalyticsService,
  ) {}

  private get doctorId(): string {
    return this.auth.currentUserValue?.id ?? '';
  }

  private key(suffix: string): string {
    return `cw_onboarding_${suffix}_${this.doctorId}`;
  }

  private flag(suffix: string): boolean {
    try {
      return localStorage.getItem(this.key(suffix)) === '1';
    } catch {
      return false;
    }
  }

  private setFlag(suffix: string): void {
    try {
      localStorage.setItem(this.key(suffix), '1');
    } catch {
      /* storage may be unavailable (private mode); ignore */
    }
  }

  private removeItem(suffix: string): void {
    try {
      localStorage.removeItem(this.key(suffix));
    } catch {
      /* storage may be unavailable (private mode); ignore */
    }
  }

  /** True when the checklist should stay hidden (snoozed or permanently dismissed). */
  private isChecklistHidden(): boolean {
    if (this.flag('hidden_permanent') || this.flag('dismissed')) {
      return true;
    }
    const remindUntil = this.getRemindUntilTimestamp();
    if (remindUntil === null) {
      return false;
    }
    if (Date.now() < remindUntil) {
      return true;
    }
    this.removeItem('remind_until');
    return false;
  }

  private getRemindUntilTimestamp(): number | null {
    try {
      const raw = localStorage.getItem(this.key('remind_until'));
      if (!raw) {
        return null;
      }
      const ts = Number.parseInt(raw, 10);
      return Number.isFinite(ts) ? ts : null;
    } catch {
      return null;
    }
  }

  async getStatus(): Promise<OnboardingStatus> {
    const user = this.auth.currentUserValue;
    const profileCompleted = !!user?.logo?.trim() && !!user?.phoneNumber?.trim();
    const patientAdded = this.flag('patient') || this.hasAnyPatient();
    const appointmentCreated = this.flag('appointment') || (await this.hasAnyAppointment());
    const dismissed = this.isChecklistHidden();

    const completedCount = [
      profileCompleted,
      patientAdded,
      appointmentCreated,
    ].filter(Boolean).length;

    return {
      profileCompleted,
      patientAdded,
      appointmentCreated,
      completedCount,
      totalSteps: this.totalSteps,
      allComplete: completedCount === this.totalSteps,
      dismissed,
    };
  }

  /** Uses synced {@link UserSubscription.patientsCount} — no Firestore read. */
  private hasAnyPatient(): boolean {
    if (this.flag('patient')) {
      return true;
    }
    const count = this.auth.currentUserValue?.subscription?.patientsCount ?? 0;
    if (count > 0) {
      this.setFlag('patient');
      return true;
    }
    return false;
  }

  private async hasAnyAppointment(): Promise<boolean> {
    if (!this.doctorId) {
      return false;
    }
    try {
      const snapshot = await this.firestore
        .collection('appointments')
        .ref.where('doctorId', '==', this.doctorId)
        .limit(1)
        .get();
      const exists = !snapshot.empty;
      if (exists) {
        this.setFlag('appointment');
      }
      return exists;
    } catch (error) {
      console.warn('[onboarding] appointment check failed', error);
      return false;
    }
  }

  /**
   * @param wasFirst pass true when the patient just added is the clinic's first
   *                 (caller knows the count). Deduplicated against local flag.
   */
  recordPatientAdded(wasFirst: boolean): void {
    const first = wasFirst && !this.flag('patient');
    this.setFlag('patient');
    this.analytics.patientAdded(first);
    void this.maybeRecordOnboardingComplete();
  }

  recordAppointmentCreated(): void {
    const first = !this.flag('appointment');
    this.setFlag('appointment');
    this.analytics.appointmentCreated(first);
    void this.maybeRecordOnboardingComplete();
  }

  /** Call after phone or logo is saved when both may now be present. */
  recordProfileIfComplete(): void {
    const user = this.auth.currentUserValue;
    if (!user?.logo?.trim() || !user?.phoneNumber?.trim()) {
      return;
    }
    this.analytics.profileCompleted(this.doctorId);
    void this.maybeRecordOnboardingComplete();
  }

  private async maybeRecordOnboardingComplete(): Promise<void> {
    const status = await this.getStatus();
    if (!status.allComplete) {
      return;
    }
    this.analytics.onboardingCompleted(this.doctorId);
  }

  /** Hide the checklist for {@link remindLaterDays} days, then show again if incomplete. */
  remindLater(): void {
    this.analytics.onboardingRemindLater();
    const until = Date.now() + this.remindLaterDays * this.msPerDay;
    try {
      localStorage.setItem(this.key('remind_until'), String(until));
    } catch {
      /* storage may be unavailable (private mode); ignore */
    }
  }

  /** Permanently hide the checklist for this doctor on this browser. */
  dismissPermanently(): void {
    this.analytics.onboardingDismissPermanent();
    this.setFlag('hidden_permanent');
    this.removeItem('remind_until');
  }
}
