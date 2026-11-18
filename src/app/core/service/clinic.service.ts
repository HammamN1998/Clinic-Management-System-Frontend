import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import firebase from 'firebase/compat/app';
import { EMPTY, Observable, combineLatest, firstValueFrom, of } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, shareReplay, switchMap } from 'rxjs/operators';
import { FirebaseAuthenticationService } from '../../authentication/services/firebase-authentication.service';
import { ClinicContextService } from '@core/service/clinic-context.service';
import { NotificationService } from '@core/service/notification.service';
import { DentalNotation } from '@core/models/patient.model';
import { User } from '@core/models/user';
import {
  AgreementStatus,
  ClinicAgreement,
  ClinicBrand,
  ClinicDoctor,
  ClinicInvite,
  ClinicMembership,
  ClinicProfile,
  ClinicRole,
  ClinicTerms,
  DEFAULT_SECRETARY_HIDDEN,
  FieldChange,
  HistoryAction,
  HistoryCollection,
  HistoryEntry,
  InviteStatus,
  LinkedDoctor,
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
  clinicName?: string;
  clinicLogo?: string;
  clinicLogoSize?: number;
  currency?: string;
  defaultAppointmentDuration?: number;
  calendarShowAttendedAppointments?: string;
  preferredDentalNotation?: DentalNotation;
  isAdmin?: boolean;
  isSecretary?: boolean;
  secretaryHidden?: string[];
  maxSeats?: number;
  clinicAdminId?: string;
  linkedAt?: StoredTimestamp;
  currentAgreementId?: string;
  pendingAgreementId?: string;
}

interface ClinicDoc {
  name?: string;
  adminName?: string;
  logo?: string;
  doctors?: Record<string, { name?: string; active?: boolean; secretary?: boolean }>;
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
  role?: ClinicRole;
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

interface HistoryDoc {
  doctorId: string;
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
    isSecretary: doc.isSecretary === true,
    // Read the way the functions read it: anything but a positive number means no seats.
    maxSeats: typeof doc.maxSeats === 'number' && doc.maxSeats > 0 ? Math.floor(doc.maxSeats) : 0,
    clinicAdminId: doc.clinicAdminId || null,
    linkedAt: toDate(doc.linkedAt),
    currentAgreementId: doc.currentAgreementId || null,
    pendingAgreementId: doc.pendingAgreementId || null,
  };
}

function toLinkedDoctor(doc: DoctorDoc & { id: string }): LinkedDoctor {
  return {
    ...toMembership(doc.id, doc),
    name: doc.name ?? '',
    email: doc.email ?? '',
    img: doc.img ?? '',
  };
}

/** What the app reads of the clinic admin's profile while a linked doctor works in his account, with the defaults sign-in applies. */
function toClinicAccount(adminId: string, doc: DoctorDoc): User {
  return Object.assign(new User(), {
    id: adminId,
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

/**
 * The clinic's doctors, the admin first, then by name. A clinic saved before the list was added
 * has no entry for its admin until he next changes his profile, so one is made for him.
 */
function toClinicDoctors(adminId: string, doc: ClinicDoc | undefined, adminName: string): ClinicDoctor[] {
  const doctors = Object.entries(doc?.doctors ?? {}).map(([doctorId, entry]) => ({
    doctorId,
    name: entry?.name ?? '',
    active: entry?.active !== false,
    secretary: entry?.secretary === true,
  }));
  if (!doctors.some((doctor) => doctor.doctorId === adminId)) {
    doctors.push({ doctorId: adminId, name: adminName, active: true, secretary: false });
  }
  return doctors.sort(
    (a, b) => Number(b.doctorId === adminId) - Number(a.doctorId === adminId) || a.name.localeCompare(b.name),
  );
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
    role: doc.role === 'secretary' ? 'secretary' : 'doctor',
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

function toHistoryEntry(id: string, doc: HistoryDoc): HistoryEntry {
  return {
    id,
    doctorId: doc.doctorId,
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
  };
}

const newestFirst = (a: ClinicInvite, b: ClinicInvite) => (b.sentAt?.getTime() ?? 0) - (a.sentAt?.getTime() ?? 0);

const isMembership = (membership: ClinicMembership | null): membership is ClinicMembership => membership !== null;

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
  /**
   * The admin of the clinic account on screen: the signed-in admin in his own account, or the
   * admin whose account a linked doctor works in. Null in any other account.
   */
  readonly clinicAccountId$: Observable<string | null>;
  /** Everyone who works or worked in the clinic account on screen. Empty in any other account. */
  readonly accountDoctors$: Observable<ClinicDoctor[]>;
  /** What the signed-in secretary's admin hid from him in patient profiles. Empty for anyone else. */
  readonly secretaryHidden$: Observable<string[]>;

  constructor(
    private auth: AngularFireAuth,
    private firestore: AngularFirestore,
    private functions: AngularFireFunctions,
    private translate: TranslateService,
    private authService: FirebaseAuthenticationService,
    private clinicContext: ClinicContextService,
    private router: Router,
    private location: Location,
    private notificationService: NotificationService,
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
    this.clinicAccountId$ = combineLatest([this.membership$, this.clinicContext.acting$]).pipe(
      map(([membership, acting]) => acting?.doctor.id ?? (membership?.isAdmin ? membership.doctorId : null)),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.accountDoctors$ = this.clinicAccountId$.pipe(
      switchMap((adminId) => (adminId ? this.clinicDoctors$(adminId) : of([]))),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.secretaryHidden$ = this.membership$.pipe(
      map((membership) => (membership?.isSecretary ? membership.clinicAdminId : null)),
      distinctUntilChanged(),
      switchMap((adminId) =>
        adminId
          ? this.firestore
              .collection('doctors')
              .doc<DoctorDoc>(adminId)
              .valueChanges()
              .pipe(
                map((doc) => doc?.secretaryHidden ?? DEFAULT_SECRETARY_HIDDEN),
                catchError((err) => this.readFailed('secretary settings', err, DEFAULT_SECRETARY_HIDDEN as string[])),
              )
          : of([] as string[]),
      ),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.followClinicAccount();
  }

  /** The signed-in admin's secretary settings, read once for the Clinic > Doctors page. */
  async ownSecretaryHidden(): Promise<string[]> {
    const snapshot = await firstValueFrom(
      this.firestore.collection('doctors').doc<DoctorDoc>(this.authService.currentUserValue.id).get(),
    );
    return snapshot.data()?.secretaryHidden ?? [...DEFAULT_SECRETARY_HIDDEN];
  }

  /**
   * Opens the clinic account for the signed-in linked doctor, on its dashboard. Says so when it
   * cannot be read, as once his link has ended.
   */
  async openClinicAccount(): Promise<void> {
    try {
      const adminId = (await firstValueFrom(this.membership$))?.clinicAdminId;
      const doc = adminId
        ? (await firstValueFrom(this.firestore.collection('doctors').doc<DoctorDoc>(adminId).get())).data()
        : undefined;
      if (!adminId || !doc) {
        throw new Error('The signed-in doctor is not linked to a clinic');
      }
      this.clinicContext.set(toClinicAccount(adminId, doc));
      // A secretary has no dashboard: his first page is the appointments calendar.
      const secretary = (await firstValueFrom(this.membership$))?.isSecretary;
      await this.router.navigate([secretary ? '/calendar' : '/admin/dashboard/main']);
    } catch (err) {
      console.error('Failed to open the clinic account', err);
      this.notificationService.showSwalOkDialog(
        this.translate.instant('CLINIC.ACTING.OPEN_FAILED'),
        'error',
        'center',
        this.translate.instant('COMMON.OK'),
      );
    }
  }

  /** The clinic of the account on screen, whose name and logo head its PDFs. Null in any other account. */
  async activeClinic(): Promise<ClinicProfile | null> {
    const adminId = await firstValueFrom(this.clinicAccountId$);
    return adminId ? firstValueFrom(this.clinicProfile$(adminId)) : null;
  }

  /** The signed-in admin's clinic name and logo, without the fallbacks the clinic profile applies. */
  async ownBrand(): Promise<ClinicBrand> {
    const snapshot = await firstValueFrom(
      this.firestore.collection('doctors').doc<DoctorDoc>(this.authService.currentUserValue.id).get(),
    );
    const doc = snapshot.data();
    return { name: doc?.clinicName ?? '', logo: doc?.clinicLogo ?? '', logoSize: doc?.clinicLogoSize ?? 0 };
  }

  /** Saves the signed-in admin's clinic name, and his clinic logo when given. A function then updates the clinic profile. */
  saveBrand(name: string, logo?: { url: string; size: number }): Promise<void> {
    const update: DoctorDoc = { clinicName: name };
    if (logo) {
      update.clinicLogo = logo.url;
      update.clinicLogoSize = logo.size;
    }
    return this.firestore.collection('doctors').doc(this.authService.currentUserValue.id).update(update);
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

  /** Everyone who works or worked in the admin's clinic: the admin first, then by name. */
  clinicDoctors$(adminId: string): Observable<ClinicDoctor[]> {
    return this.firestore
      .collection('clinics')
      .doc<ClinicDoc>(adminId)
      .valueChanges()
      .pipe(
        map((doc) => {
          const user = this.authService.currentUserValue;
          const adminName = doc?.adminName || (user?.id === adminId ? user.name || user.email : '');
          return toClinicDoctors(adminId, doc, adminName);
        }),
        catchError((err) => this.readFailed('clinic doctors', err, [])),
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

  /** One page of the clinic account's history, newest first, of everyone's changes or only those of `actorId`. */
  async historyPage(
    accountId: string,
    actorId: string | null,
    pageSize: number,
    after: firebase.firestore.QueryDocumentSnapshot<unknown> | null,
  ): Promise<HistoryPage> {
    let query = this.firestore.collection('recordHistory').ref.where('doctorId', '==', accountId);
    if (actorId) {
      query = query.where('actorId', '==', actorId);
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

  inviteDoctor(email: string, terms: ClinicTerms, role: ClinicRole): Promise<{ inviteId: string }> {
    return this.call('inviteDoctor', { email, terms, role });
  }

  /** Saves which parts of the patient profile the signed-in admin's secretary cannot see. */
  saveSecretaryHidden(hidden: string[]): Promise<void> {
    return this.firestore.collection('doctors').doc(this.authService.currentUserValue.id).update({ secretaryHidden: hidden });
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

  /** Ends a link at once. Without `doctorId` the signed-in doctor leaves his clinic; with it his admin removes him. */
  unlink(doctorId?: string): Promise<{ unlinked: boolean }> {
    return this.call('unlink', doctorId ? { doctorId } : {});
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
   * A linked doctor or secretary starts in the clinic account as soon as he is linked, including
   * the moment he accepts an invitation. A tab opened on My clinic, where the emails about his
   * terms take him, stays there. While he works in the clinic account it is watched, since its
   * admin may change its settings, and left with a notice once he is no longer linked to it.
   * After the unlink the rules refuse the read, which ends the watch with an error.
   */
  private followClinicAccount(): void {
    this.membership$
      .pipe(
        map((membership) => membership?.clinicAdminId ?? null),
        distinctUntilChanged(),
        filter((adminId) => !!adminId),
      )
      .subscribe(() => {
        if (this.clinicContext.isActing || this.clinicContext.choseOwnAccount) {
          return;
        }
        const path = this.location.path();
        const page = this.router.parseUrl(path).queryParamMap.get('returnUrl') ?? path;
        if (page.startsWith('/admin/doctors/my-clinic')) {
          return;
        }
        void this.openClinicAccount();
      });

    const linkedTo$ = this.membership$.pipe(
      filter(isMembership),
      map((membership) => membership.clinicAdminId),
      distinctUntilChanged(),
    );
    const accountId$ = this.clinicContext.acting$.pipe(
      map((acting) => acting?.doctor.id ?? null),
      distinctUntilChanged(),
    );
    combineLatest([linkedTo$, accountId$])
      .pipe(
        switchMap(([linkedTo, accountId]) => {
          if (!accountId) {
            return EMPTY;
          }
          if (linkedTo !== accountId) {
            return of(null);
          }
          return this.firestore
            .collection('doctors')
            .doc<DoctorDoc>(accountId)
            .valueChanges()
            .pipe(
              map((doc) => (doc ? toClinicAccount(accountId, doc) : null)),
              catchError((err) => {
                console.error('Failed to read the clinic account', err);
                return of(null);
              }),
            );
        }),
      )
      .subscribe((account) => {
        if (account) {
          this.clinicContext.set(account);
          return;
        }
        this.clinicContext.clear();
        void this.router.navigate(['/admin/doctors/my-clinic']);
        this.notificationService.showSnackBarNotification(
          'snackbar-danger',
          this.translate.instant('CLINIC.ACTING.LINK_ENDED'),
          'bottom',
          'center',
        );
      });
  }

  private readFailed<T>(what: string, err: unknown, fallback: T): Observable<T> {
    console.error(`Failed to read ${what}`, err);
    return of(fallback);
  }
}
