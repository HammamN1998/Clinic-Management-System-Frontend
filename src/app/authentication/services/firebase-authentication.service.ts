import {Injectable} from '@angular/core';
import {BehaviorSubject, firstValueFrom, from, map, Observable, of, throwError} from "rxjs";
import {User} from "@core";
import { UserSubscription } from '@core/models/user';
import {AngularFireAuth} from "@angular/fire/compat/auth";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {AngularFireFunctions} from "@angular/fire/compat/functions";
import {Router} from "@angular/router";
import {NotificationService} from "@core/service/notification.service";
import {TranslateService} from "@ngx-translate/core";
import {AnalyticsService} from "@core/service/analytics.service";

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthenticationService {

  private currentUserSubject: BehaviorSubject<User>;
  public currentUser: Observable<User>;

  constructor(
    private auth: AngularFireAuth,
    private firestore: AngularFirestore,
    private router: Router,
    private notificationService: NotificationService,
    private functions: AngularFireFunctions,
    private translate: TranslateService,
    private analytics: AnalyticsService,
  ) {

    this.currentUserSubject = new BehaviorSubject<User>(
      JSON.parse(localStorage.getItem('currentUser') || '{}')
    );
    this.currentUser = this.currentUserSubject.asObservable();

    this.traceAuthenticationStatus();
  }

  public get currentUserValue(): User {
    return this.currentUserSubject.value;
  }

  persistCurrentUser(): void {
    localStorage.setItem('currentUser', JSON.stringify(this.currentUserSubject.value));
  }

  login(userName: string, password: string) {
    return from ( this.auth.signInWithEmailAndPassword( userName, password ) )
  }

  loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return from ( this.auth.signInWithPopup( provider ) )
  }

  /** Translated Google sign-in failure, or null when the user simply closed the popup. */
  googleSignInErrorMessage(error: unknown): string | null {
    const code = (error as { code?: string } | null)?.code;
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return null;
    }
    if (code === 'auth/account-exists-with-different-credential') {
      return this.translate.instant('AUTH.GOOGLE.EMAIL_ALREADY_REGISTERED');
    }
    return this.translate.instant('AUTH.GOOGLE.GENERIC_ERROR');
  }

  private updateStripeCustomerEmail(doctorId: string, email: string): Observable<{ message: string }> {
    if (typeof doctorId !== 'string' || !doctorId.trim()) {
      return throwError(() => new Error('Invalid doctor id.'));
    }
    const callable = this.functions.httpsCallable<{ doctorId: string, email: string }, { message: string }>('updateStripeCustomerEmail');
    return callable({ doctorId: doctorId.trim(), email: email.trim() });
  }

  updateStripeCustomerName(doctorId: string, name: string): Observable<{ message: string }> {
    if (typeof doctorId !== 'string' || !doctorId.trim()) {
      return throwError(() => new Error('Invalid doctor id.'));
    }
    const callable = this.functions.httpsCallable<{ doctorId: string, name: string }, { message: string }>('updateStripeCustomerName');
    return callable({ doctorId: doctorId.trim(), name: name.trim() });
  }

  async signup(email: string, password: string, name: string): Promise<void> {
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      if (userCredential?.user == null) {
        console.log('userCredential is null of undefined!!');
        return;
      }
      const user = userCredential.user;
      user.updateProfile({ displayName: name });
      const uid = user.uid;
      let localUser = new User();
      localUser.id = uid;
      localUser.name = name;
      localUser.email = email;
      this.currentUserSubject.next(localUser);
      await this.firestore.collection('doctors').doc(uid).set({...localUser});
      this.analytics.setDoctorUserId(uid);
      this.analytics.signupComplete();
      await this.sendEmailVerificationCode();
      this.router.navigate(['/authentication/verify-email']);
    } catch (err) {
      console.error('signup failed', err);
    }
  }

  logout() {
    this.auth.signOut();
    return of({ success: false });
  }

  private isGoogleUser(fireAuthUser: firebase.User): boolean {
    return fireAuthUser.providerData.some(
      (provider) => provider?.providerId === firebase.auth.GoogleAuthProvider.PROVIDER_ID
    );
  }

  /**
   * Google users never go through the signup form, so their doctor document is
   * created on first sign-in. The name is left empty on purpose; the doctor can
   * set it later from the profile page.
   */
  private async createMinimalDoctorProfile(fireAuthUser: firebase.User): Promise<void> {
    const doctor = new User();
    doctor.id = fireAuthUser.uid;
    doctor.email = fireAuthUser.email ?? '';
    doctor.name = fireAuthUser.displayName ?? '';
    await this.firestore.collection('doctors').doc(fireAuthUser.uid).set({...doctor});
    this.analytics.setDoctorUserId(fireAuthUser.uid);
    this.analytics.signupComplete();
  }

  fireAuthUserToUser(fireUser: firebase.User) : User {
    const doctor = new User();
    doctor.id = fireUser!.uid!;
    doctor.email = fireUser!.email!;
    doctor.name = fireUser.displayName ?? '';
    return doctor
  }

  sendResetPasswordEmail(email: string) {
    return this.auth.sendPasswordResetEmail(email);
  }

  async sendEmailVerificationCode() {
    try {
      const currentUser = await this.auth.currentUser;
      if (currentUser!.emailVerified) return
      await currentUser!.sendEmailVerification();
      this.notificationService.showSwalNotification(
        this.translate.instant('AUTH.VERIFY.LINK_SENT'),
        'success',
        'center',
        true,
        false
      );
    } catch (error) {
      console.log(error)
      throw error;
    }
  }

  async isEmailVerified(){
    try {
      const currentUser = await this.auth.currentUser;
      return currentUser!.emailVerified
    } catch (error) {
      console.log(error)
      return false
    }
  }

  traceAuthenticationStatus() {
    // Put this snippet of code on a separate method because constructor cant handle Observer correctly.
    this.auth.authState.subscribe(async (fireAuthUser) => {
      if (fireAuthUser) {
        try {
          // store user details local storage to keep user logged in between page refreshes
          let firebaseUser = await firstValueFrom(
            this.firestore.collection('doctors').doc(fireAuthUser.uid).get()
          );
          if (!firebaseUser.exists && this.isGoogleUser(fireAuthUser)) {
            await this.createMinimalDoctorProfile(fireAuthUser);
            firebaseUser = await firstValueFrom(
              this.firestore.collection('doctors').doc(fireAuthUser.uid).get()
            );
          }
          const userSubscription = await firstValueFrom(
            this.firestore.collection('doctorSubscriptions').doc(fireAuthUser.uid).get()
          );
          if (firebaseUser.exists) {
            const firestoreUser: User = firebaseUser.data() as User;
            const localUser: User = this.fireAuthUserToUser(fireAuthUser);
            localUser.phoneNumber = firestoreUser.phoneNumber;
            localUser.address = firestoreUser.address;
            localUser.education = firestoreUser.education;
            localUser.about = firestoreUser.about;
            localUser.experience = firestoreUser.experience;
            localUser.img = firestoreUser.img ?? '';
            localUser.imgSize = firestoreUser.imgSize ?? 0;
            localUser.logo = firestoreUser.logo;
            localUser.logoSize = firestoreUser.logoSize;
            localUser.preferredDentalNotation = firestoreUser.preferredDentalNotation;
            localUser.religiousRemindersEnabled = firestoreUser.religiousRemindersEnabled ?? 'true';
            localUser.calendarShowAttendedAppointments = firestoreUser.calendarShowAttendedAppointments ?? 'true';
            if (userSubscription.exists) {
              const userSubscriptionData: UserSubscription = userSubscription.data() as UserSubscription;
              localUser.subscription = userSubscriptionData;
            }
            this.currentUserSubject.next(localUser);
            localStorage.setItem('currentUser', JSON.stringify(localUser));
            this.analytics.setDoctorUserId(fireAuthUser.uid);
            if (fireAuthUser.emailVerified) {
              this.analytics.emailVerified(fireAuthUser.uid);
            }
            const isOnAuthPages =
              this.router.url === '/authentication/signup' ||
              this.router.url === '/authentication/signin' ||
              this.router.url === '/authentication/verify-email';

            if (isOnAuthPages) {
              if (fireAuthUser.emailVerified) {
                // Sync Firestore email with Firebase Auth email after verification.
                if (firestoreUser.email !== fireAuthUser.email) {
                  this.firestore.collection('doctors').doc(fireAuthUser.uid).update({ email: fireAuthUser.email });
                  firstValueFrom(this.updateStripeCustomerEmail(fireAuthUser.uid, fireAuthUser.email!));
                }
                this.router.navigate(['/admin/dashboard/main']);
              } else {
                this.router.navigate(['/authentication/verify-email']);
              }
            }
            console.log('user logged in', JSON.stringify(localUser));
          }
        } catch (err) {
          console.error('Failed to load doctor profile', err);
        }
      } else {
        // remove user from local storage to log user out
        this.analytics.clearDoctorUserId();
        localStorage.removeItem('currentUser');
        this.router.navigate(['/authentication/signin']);
        console.log('user not logged in');
      }
    });
  }

}
