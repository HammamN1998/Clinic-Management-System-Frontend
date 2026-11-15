import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore, QueryFn } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import firebase from 'firebase/compat/app';
import { EMPTY, Observable, combineLatest, firstValueFrom, from, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs/operators';
import { FirebaseAuthenticationService } from '../../authentication/services/firebase-authentication.service';
import { ActingContext, ClinicContextService } from '@core/service/clinic-context.service';
import { NotificationService } from '@core/service/notification.service';
import { PatientService } from '@core/service/patient.service';
import { DentalNotation, Patient } from '@core/models/patient.model';
import { User, UserSubscription } from '@core/models/user';
import {
  AgreementStatus,
  ClinicAccess,
  ClinicAgreement,
  ClinicDoctor,
  ClinicInvite,
  ClinicMembership,
  ClinicProfile,
  ClinicTerms,
  FieldChange,
  HistoryAction,
  HistoryCollection,
  HistoryEntry,
  InviteStatus,
  LinkedDoctor,
  PatientDeletionRequest,
  isOpenInvite,
} from '@core/models/clinic.model';

interface StoredTimestamp {
  toDate(): Date;
}

interface DoctorDoc {
  name?: string;
  email?: string;
  img?: string;
  phoneNumber?: string;
  address?: string;
  logo?: string;
  currency?: string;
  defaultAppointmentDuration?: number;
  calendarShowAttendedAppointments?: string;
  preferredDentalNotation?: DentalNotation;
  isAdmin?: boolean;
  maxSeats?: number;
  clinicAdminId?: string;
  linkedAt?: StoredTimestamp;
  clinicAccess?: ClinicAccess;
  currentAgreementId?: string;
  pendingAgreementId?: string;
  unlinkEffectiveAt?: StoredTimestamp;
  unlinkRequestedBy?: 'doctor' | 'admin';
}

interface ClinicDoc {
  name?: string;
  adminName?: string;
  logo?: string;
}

interface InviteDoc {
  adminId: string;
  doctorId: string;
  email?: string;
  adminName?: string;
  clinicName?: string;
  doctorName?: string;
  status: InviteStatus;
  terms: ClinicTerms;
  sentAt?: StoredTimestamp;
  sendCount?: number;
  expiresAt?: StoredTimestamp;
}

interface AgreementDoc {
  adminId: string;
  doctorId: string;
  status: AgreementStatus;
  terms: ClinicTerms;
  proposedAt?: StoredTimestamp;
  acceptedAt?: StoredTimestamp;
}

interface DeletionRequestDoc {
  doctorId: string;
  adminId: string;
  patientId: string;
  patientName?: string;
  status: 'pending' | 'rejected';
  requestedAt?: StoredTimestamp;
  answeredAt?: StoredTimestamp;
}

interface HistoryDoc {
  doctorId: string;
  adminId: string;
  collection: HistoryCollection;
  recordId: string;
  patientId?: string | null;
  patientName?: string;
  action: HistoryAction;
  actorId?: string | null;
  at?: StoredTimestamp;
  data?: Record<string, unknown>;
  changed?: Record<string, FieldChange>;
  dentalChartChanged?: boolean;
  tooLarge?: boolean;
  approvedBy?: string;
  requestedAt?: StoredTimestamp;
}

export interface HistoryPage {
  entries: HistoryEntry[];
  /** Pass it back to read the page after this one. */
  last: firebase.firestore.QueryDocumentSnapshot<unknown> | null;
}

function toDate(value: StoredTimestamp | undefined): Date | null {
  return value && typeof value.toDate === 'function' ? value.toDate() : null;
}

function toMembership(doctorId: string, doc: DoctorDoc): ClinicMembership {
  return {
    doctorId,
    isAdmin: doc.isAdmin === true,
    // Read the way the functions read it: anything but a positive number means no seats.
    maxSeats: typeof doc.maxSeats === 'number' && doc.maxSeats > 0 ? Math.floor(doc.maxSeats) : 0,
    clinicAdminId: doc.clinicAdminId || null,
    linkedAt: toDate(doc.linkedAt),
    clinicAccess: doc.clinicAccess ?? null,
    currentAgreementId: doc.currentAgreementId || null,
    pendingAgreementId: doc.pendingAgreementId || null,
    unlinkEffectiveAt: toDate(doc.unlinkEffectiveAt),
    unlinkRequestedBy: doc.unlinkRequestedBy ?? null,
  };
}

function toLinkedDoctor(doc: DoctorDoc & { id: string }): LinkedDoctor {
  return {
    ...toMembership(doc.id, doc),
    name: doc.name ?? '',
    email: doc.email ?? '',
    img: doc.img ?? '',
    currency: doc.currency,
    defaultAppointmentDuration: doc.defaultAppointmentDuration,
  };
}

/** What the app reads of a doctor's profile while his clinic admin works in his account, with the defaults sign-in applies. */
function toActingDoctor(doctorId: string, doc: DoctorDoc): User {
  return Object.assign(new User(), {
    id: doctorId,
    name: doc.name ?? '',
    email: doc.email ?? '',
    img: doc.img ?? '',
    phoneNumber: doc.phoneNumber ?? '',
    address: doc.address ?? '',
    logo: doc.logo ?? '',
    currency: doc.currency,
    defaultAppointmentDuration: doc.defaultAppointmentDuration ?? 30,
    calendarShowAttendedAppointments: doc.calendarShowAttendedAppointments ?? 'true',
    preferredDentalNotation: doc.preferredDentalNotation,
  });
}

function toProfile(adminId: string, doc: ClinicDoc): ClinicProfile {
  return { adminId, name: doc.name ?? '', adminName: doc.adminName ?? '', logo: doc.logo ?? '' };
}

function toInvite(doc: InviteDoc & { id: string }): ClinicInvite {
  return {
    id: doc.id,
    adminId: doc.adminId,
    doctorId: doc.doctorId,
    email: doc.email ?? '',
    adminName: doc.adminName ?? '',
    clinicName: doc.clinicName ?? '',
    doctorName: doc.doctorName ?? '',
    status: doc.status,
    terms: doc.terms,
    sentAt: toDate(doc.sentAt),
    sendCount: doc.sendCount ?? 1,
    expiresAt: toDate(doc.expiresAt),
  };
}

function toAgreement(id: string, doc: AgreementDoc): ClinicAgreement {
  return {
    id,
    adminId: doc.adminId,
    doctorId: doc.doctorId,
    status: doc.status,
    terms: doc.terms,
    proposedAt: toDate(doc.proposedAt),
    acceptedAt: toDate(doc.acceptedAt),
  };
}

function toDeletionRequest(doc: DeletionRequestDoc): PatientDeletionRequest {
  return {
    patientId: doc.patientId,
    doctorId: doc.doctorId,
    adminId: doc.adminId,
    patientName: doc.patientName ?? '',
    status: doc.status,
    requestedAt: toDate(doc.requestedAt),
    answeredAt: toDate(doc.answeredAt),
  };
}

function toHistoryEntry(id: string, doc: HistoryDoc): HistoryEntry {
  return {
    id,
    doctorId: doc.doctorId,
    adminId: doc.adminId,
    collection: doc.collection,
    recordId: doc.recordId,
    patientId: doc.patientId ?? null,
    patientName: doc.patientName ?? '',
    action: doc.action,
    actorId: doc.actorId ?? null,
    at: toDate(doc.at),
    data: doc.data ?? null,
    changed: doc.changed ?? null,
    dentalChartChanged: doc.dentalChartChanged === true,
    tooLarge: doc.tooLarge === true,
    approvedBy: doc.approvedBy ?? null,
    requestedAt: toDate(doc.requestedAt),
  };
}

const newestFirst = (a: ClinicInvite, b: ClinicInvite) => (b.sentAt?.getTime() ?? 0) - (a.sentAt?.getTime() ?? 0);

const newestRequestFirst = (a: PatientDeletionRequest, b: PatientDeletionRequest) =>
  (b.requestedAt?.getTime() ?? 0) - (a.requestedAt?.getTime() ?? 0);

/**
 * Clinic state and actions. Only Cloud Functions write clinic data, so this service reads
 * it live (the functions change it while the app is open) and calls the clinic callables.
 */
@Injectable({ providedIn: 'root' })
export class ClinicService {
  /** The signed-in doctor's clinic fields. Null while signed out. */
  readonly membership$: Observable<ClinicMembership | null>;
  /** Invitations the signed-in doctor can still answer, newest first. Always empty for an admin, who cannot join a clinic. */
  readonly pendingInvites$: Observable<ClinicInvite[]>;
  /** The clinic the signed-in doctor belongs to. Null when he is not linked. */
  readonly clinic$: Observable<ClinicProfile | null>;
  /** The signed-in doctor's agreement in force. */
  readonly currentAgreement$: Observable<ClinicAgreement | null>;
  /** New terms waiting for the signed-in doctor's answer. */
  readonly pendingAgreement$: Observable<ClinicAgreement | null>;
  /** The signed-in doctor's requests to delete patients, pending or rejected, newest first. Always empty for an admin. */
  readonly deletionRequests$: Observable<PatientDeletionRequest[]>;
  /** Whether the signed-in doctor, no longer linked, still has history from the clinic he left. It outlasts the link by 90 days. */
  readonly pastHistory$: Observable<boolean>;

  constructor(
    private auth: AngularFireAuth,
    private firestore: AngularFirestore,
    private functions: AngularFireFunctions,
    private translate: TranslateService,
    private authService: FirebaseAuthenticationService,
    private clinicContext: ClinicContextService,
    private router: Router,
    private notificationService: NotificationService,
    private patientService: PatientService,
  ) {
    const uid$ = this.auth.authState.pipe(
      map((user) => user?.uid ?? null),
      distinctUntilChanged(),
    );
    this.membership$ = uid$.pipe(
      switchMap((uid) => (uid ? this.watchMembership(uid) : of(null))),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.pendingInvites$ = this.membership$.pipe(
      map((membership) => (membership && !membership.isAdmin ? membership.doctorId : null)),
      distinctUntilChanged(),
      switchMap((doctorId) => (doctorId ? this.watchPendingInvites(doctorId) : of([]))),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.clinic$ = this.followMembership((m) => m.clinicAdminId, (id) => this.clinicProfile$(id));
    this.currentAgreement$ = this.followMembership((m) => m.currentAgreementId, (id) => this.agreement$(id));
    this.pendingAgreement$ = this.followMembership((m) => m.pendingAgreementId, (id) => this.agreement$(id));
    this.deletionRequests$ = this.membership$.pipe(
      map((membership) => (membership && !membership.isAdmin ? membership.doctorId : null)),
      distinctUntilChanged(),
      switchMap((doctorId) =>
        doctorId ? this.watchDeletionRequests((ref) => ref.where('doctorId', '==', doctorId)) : of([]),
      ),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.pastHistory$ = this.membership$.pipe(
      map((membership) => (membership && !membership.isAdmin && !membership.clinicAdminId ? membership.doctorId : null)),
      distinctUntilChanged(),
      switchMap((doctorId) => (doctorId ? from(this.hasHistory(doctorId)) : of(false))),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.reloadSubscriptionOnLinkChange();
    this.followActingDoctor(uid$);
  }

  /** Opens a linked doctor's account for the signed-in admin. Resolves to false when that doctor is no longer linked to him. */
  async openDoctorAccount(doctorId: string): Promise<boolean> {
    const adminId = this.authService.currentUserValue?.id;
    try {
      const snapshot = await firstValueFrom(this.firestore.collection('doctors').doc<DoctorDoc>(doctorId).get());
      const doc = snapshot.data();
      if (!adminId || doc?.clinicAdminId !== adminId) {
        return false;
      }
      this.clinicContext.set(toActingDoctor(doctorId, doc), doc.clinicAccess ?? 'view');
      return true;
    } catch (err) {
      console.error('Failed to open the doctor account', err);
      return false;
    }
  }

  /**
   * Opens a patient's profile in the account he belongs to: the signed-in admin's own, or a
   * linked doctor's. Says so when that doctor is no longer linked to the admin.
   */
  async openPatient(patient: Patient): Promise<void> {
    if (patient.doctorId === this.authService.currentUserValue?.id) {
      this.clinicContext.clear();
    } else if (!(await this.openDoctorAccount(patient.doctorId))) {
      this.notificationService.showSwalOkDialog(
        this.translate.instant('CLINIC.ACTING.OPEN_FAILED'),
        'error',
        'center',
        this.translate.instant('COMMON.OK'),
      );
      return;
    }
    // Switching accounts closes the patient open in the previous one, so he is set after the switch.
    this.patientService.dialogData = patient;
    await this.router.navigate(['/admin/patients/patient-profile']);
  }

  clinicProfile$(adminId: string): Observable<ClinicProfile | null> {
    return this.firestore
      .collection('clinics')
      .doc<ClinicDoc>(adminId)
      .valueChanges()
      .pipe(
        map((doc) => (doc ? toProfile(adminId, doc) : null)),
        catchError((err) => this.readFailed('clinic', err, null)),
      );
  }

  agreement$(agreementId: string): Observable<ClinicAgreement | null> {
    return this.firestore
      .collection('clinicAgreements')
      .doc<AgreementDoc>(agreementId)
      .valueChanges()
      .pipe(
        map((doc) => (doc ? toAgreement(agreementId, doc) : null)),
        catchError((err) => this.readFailed('agreement', err, null)),
      );
  }

  /** The admin's linked doctors, by name. */
  linkedDoctors$(adminId: string): Observable<LinkedDoctor[]> {
    return this.firestore
      .collection<DoctorDoc>('doctors', (ref) => ref.where('clinicAdminId', '==', adminId))
      .valueChanges({ idField: 'id' })
      .pipe(
        map((docs) => docs.map(toLinkedDoctor).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))),
        catchError((err) => this.readFailed('linked doctors', err, [])),
      );
  }

  /** The doctors the Clinic pages cover: the signed-in admin first, then his linked doctors by name. */
  clinicDoctors$(): Observable<ClinicDoctor[]> {
    const admin = this.authService.currentUserValue;
    if (!admin) {
      return of([]);
    }
    return this.linkedDoctors$(admin.id).pipe(
      map((linked) => [
        {
          doctorId: admin.id,
          name: admin.name || admin.email,
          isSelf: true,
          currency: admin.currency,
          defaultAppointmentDuration: admin.defaultAppointmentDuration,
          currentAgreementId: null,
          linkedAt: null,
        },
        ...linked.map((doctor) => ({
          doctorId: doctor.doctorId,
          name: doctor.name || doctor.email,
          isSelf: false,
          currency: doctor.currency,
          defaultAppointmentDuration: doctor.defaultAppointmentDuration,
          currentAgreementId: doctor.currentAgreementId,
          linkedAt: doctor.linkedAt,
        })),
      ]),
    );
  }

  /** Every invitation the admin sent, in any status, newest first. */
  adminInvites$(adminId: string): Observable<ClinicInvite[]> {
    return this.firestore
      .collection<InviteDoc>('clinicInvites', (ref) => ref.where('adminId', '==', adminId))
      .valueChanges({ idField: 'id' })
      .pipe(
        map((docs) => docs.map(toInvite).sort(newestFirst)),
        catchError((err) => this.readFailed('clinic invites', err, [])),
      );
  }

  /** Every agreement of the admin's clinic, in any status. */
  adminAgreements$(adminId: string): Observable<ClinicAgreement[]> {
    return this.firestore
      .collection<AgreementDoc>('clinicAgreements', (ref) => ref.where('adminId', '==', adminId))
      .valueChanges({ idField: 'id' })
      .pipe(
        map((docs) => docs.map((doc) => toAgreement(doc.id, doc))),
        catchError((err) => this.readFailed('clinic agreements', err, [])),
      );
  }

  /**
   * Pending requests to delete patients from the given doctors, all linked to the admin. The
   * rules let him read them one doctor at a time.
   */
  clinicDeletionRequests$(adminId: string, doctorIds: string[]): Observable<PatientDeletionRequest[]> {
    if (!doctorIds.length) {
      return of([]);
    }
    return combineLatest(
      doctorIds.map((doctorId) =>
        this.watchDeletionRequests((ref) => ref.where('doctorId', '==', doctorId).where('adminId', '==', adminId)),
      ),
    ).pipe(map((lists) => lists.flat().filter((request) => request.status === 'pending')));
  }

  /**
   * One page of a doctor's history, newest first. The clinic admin passes his own id, since
   * the rules let him read only his clinic's entries, and only while the doctor is linked.
   */
  async historyPage(
    doctorId: string,
    adminId: string | null,
    pageSize: number,
    after: firebase.firestore.QueryDocumentSnapshot<unknown> | null,
  ): Promise<HistoryPage> {
    let query = this.firestore.collection('recordHistory').ref.where('doctorId', '==', doctorId);
    if (adminId) {
      query = query.where('adminId', '==', adminId);
    }
    query = query.orderBy('at', 'desc').limit(pageSize);
    if (after) {
      query = query.startAfter(after);
    }
    const snapshot = await query.get();
    return {
      entries: snapshot.docs.map((doc) => toHistoryEntry(doc.id, doc.data() as HistoryDoc)),
      last: snapshot.docs[snapshot.docs.length - 1] ?? null,
    };
  }

  inviteDoctor(email: string, terms: ClinicTerms): Promise<{ inviteId: string }> {
    return this.call('inviteDoctor', { email, terms });
  }

  resendInvite(inviteId: string): Promise<{ inviteId: string }> {
    return this.call('resendInvite', { inviteId });
  }

  cancelInvite(inviteId: string): Promise<{ inviteId: string }> {
    return this.call('cancelInvite', { inviteId });
  }

  respondToInvite(inviteId: string, accept: boolean): Promise<{ accepted: boolean }> {
    return this.call('respondToInvite', { inviteId, accept });
  }

  proposeTerms(doctorId: string, terms: ClinicTerms): Promise<{ agreementId: string }> {
    return this.call('proposeTerms', { doctorId, terms });
  }

  respondToTerms(agreementId: string, accept: boolean): Promise<{ accepted: boolean }> {
    return this.call('respondToTerms', { agreementId, accept });
  }

  /** Without `doctorId` the signed-in doctor leaves his clinic. Resolves to when the unlink takes effect. */
  async requestUnlink(doctorId?: string): Promise<Date> {
    const { effectiveAt } = await this.call<{ effectiveAt: number }>('requestUnlink', doctorId ? { doctorId } : {});
    return new Date(effectiveAt);
  }

  /** Without `doctorId` the signed-in doctor withdraws his own leave request. */
  cancelUnlink(doctorId?: string): Promise<{ withdrawn: boolean }> {
    return this.call('cancelUnlink', doctorId ? { doctorId } : {});
  }

  completeUnlink(doctorId: string): Promise<{ unlinked: boolean }> {
    return this.call('completeUnlink', { doctorId });
  }

  /** The signed-in doctor asks his clinic to delete a patient. Asking again after a rejection reopens it. */
  requestPatientDeletion(patientId: string): Promise<{ requested: boolean }> {
    return this.call('requestPatientDeletion', { patientId });
  }

  /** The signed-in doctor withdraws his request, or clears a rejected one. */
  cancelPatientDeletion(patientId: string): Promise<{ withdrawn: boolean }> {
    return this.call('cancelPatientDeletion', { patientId });
  }

  /** The clinic admin's answer. Approving deletes the patient for good. */
  answerPatientDeletion(patientId: string, approve: boolean): Promise<{ approved: boolean }> {
    return this.call('answerPatientDeletion', { patientId, approve });
  }

  /** Recreates the deleted appointment, treatment, or payment a history entry kept. */
  restoreRecord(historyId: string): Promise<{ restored: boolean }> {
    return this.call('restoreRecord', { historyId });
  }

  /** Translated message for a failed clinic call, from the `reason` the functions attach. */
  errorMessage(err: unknown): string {
    const reason = (err as { details?: { reason?: unknown } } | null)?.details?.reason;
    if (typeof reason === 'string') {
      const key = `CLINIC.ERRORS.${reason.toUpperCase().replace(/-/g, '_')}`;
      const message = this.translate.instant(key);
      if (message !== key) {
        return message;
      }
    }
    console.error('Clinic call failed', err);
    return this.translate.instant('CLINIC.ERRORS.GENERIC');
  }

  private call<T>(name: string, data: object): Promise<T> {
    return firstValueFrom(this.functions.httpsCallable<object, T>(name)(data));
  }

  private watchMembership(doctorId: string): Observable<ClinicMembership | null> {
    return this.firestore
      .collection('doctors')
      .doc<DoctorDoc>(doctorId)
      .valueChanges()
      .pipe(
        map((doc) => (doc ? toMembership(doctorId, doc) : null)),
        catchError((err) => this.readFailed('doctor', err, null)),
      );
  }

  /** Expiry is checked when the list changes, so an invite that expires while the app is open stays listed until then. */
  private watchPendingInvites(doctorId: string): Observable<ClinicInvite[]> {
    return this.firestore
      .collection<InviteDoc>('clinicInvites', (ref) =>
        ref.where('doctorId', '==', doctorId).where('status', '==', 'pending'),
      )
      .valueChanges({ idField: 'id' })
      .pipe(
        map((docs) => {
          const now = Date.now();
          return docs.map(toInvite).filter((invite) => isOpenInvite(invite, now)).sort(newestFirst);
        }),
        catchError((err) => this.readFailed('invitations', err, [])),
      );
  }

  private async hasHistory(doctorId: string): Promise<boolean> {
    try {
      const snapshot = await this.firestore.collection('recordHistory').ref.where('doctorId', '==', doctorId).limit(1).get();
      return !snapshot.empty;
    } catch (err) {
      console.error('Failed to read the record history', err);
      return false;
    }
  }

  private watchDeletionRequests(query: QueryFn): Observable<PatientDeletionRequest[]> {
    return this.firestore
      .collection<DeletionRequestDoc>('patientDeletionRequests', query)
      .valueChanges()
      .pipe(
        map((docs) => docs.map(toDeletionRequest).sort(newestRequestFirst)),
        catchError((err) => this.readFailed('deletion requests', err, [])),
      );
  }

  /** Watches the document whose id a field of the signed-in doctor's membership holds, or emits null. */
  private followMembership<T>(
    idOf: (membership: ClinicMembership) => string | null,
    watch: (id: string) => Observable<T | null>,
  ): Observable<T | null> {
    return this.membership$.pipe(
      map((membership) => (membership ? idOf(membership) : null)),
      distinctUntilChanged(),
      switchMap((id) => (id ? watch(id) : of(null))),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  /**
   * Linking and unlinking rewrite the doctor's limits in the same transaction as his link
   * fields, so a change of `clinicAdminId` means the subscription cached at sign-in is stale.
   */
  private reloadSubscriptionOnLinkChange(): void {
    let previous: ClinicMembership | null = null;
    this.membership$.subscribe((current) => {
      if (current && previous?.doctorId === current.doctorId && previous.clinicAdminId !== current.clinicAdminId) {
        this.reloadSubscription(current.doctorId);
      }
      previous = current;
    });
  }

  /**
   * Keeps the account a clinic admin works in current, since its doctor may change his settings
   * or the access he gives, and leaves it once the doctor is no longer linked to him. After the
   * unlink the rules refuse the read, which ends the watch with an error.
   */
  private followActingDoctor(uid$: Observable<string | null>): void {
    const actingDoctorId$ = this.clinicContext.acting$.pipe(
      map((acting) => acting?.doctor.id ?? null),
      distinctUntilChanged(),
    );
    combineLatest([uid$, actingDoctorId$])
      .pipe(
        switchMap(([uid, doctorId]) => {
          if (!uid || !doctorId) {
            return EMPTY;
          }
          return this.firestore
            .collection('doctors')
            .doc<DoctorDoc>(doctorId)
            .valueChanges()
            .pipe(
              map((doc): ActingContext | null =>
                doc?.clinicAdminId === uid
                  ? { doctor: toActingDoctor(doctorId, doc), access: doc.clinicAccess ?? 'view' }
                  : null,
              ),
              catchError((err) => {
                console.error('Failed to read the doctor account', err);
                return of(null);
              }),
            );
        }),
      )
      .subscribe((acting) => {
        if (acting) {
          this.clinicContext.set(acting.doctor, acting.access);
          return;
        }
        this.clinicContext.clear();
        void this.router.navigate(['/clinic/doctors']);
        this.notificationService.showSnackBarNotification(
          'snackbar-danger',
          this.translate.instant('CLINIC.ACTING.ACCESS_ENDED'),
          'bottom',
          'center',
        );
      });
  }

  private async reloadSubscription(doctorId: string): Promise<void> {
    try {
      const snapshot = await firstValueFrom(this.firestore.collection('doctorSubscriptions').doc(doctorId).get());
      const user = this.authService.currentUserValue;
      if (snapshot.exists && user?.id === doctorId) {
        user.subscription = snapshot.data() as UserSubscription;
        this.authService.persistCurrentUser();
      }
    } catch (err) {
      console.error('Failed to reload the subscription', err);
    }
  }

  private readFailed<T>(what: string, err: unknown, fallback: T): Observable<T> {
    console.error(`Failed to read ${what}`, err);
    return of(fallback);
  }
}
