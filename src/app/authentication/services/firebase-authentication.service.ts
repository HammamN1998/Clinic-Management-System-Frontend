import {Injectable} from '@angular/core';
import {BehaviorSubject, firstValueFrom, from, map, Observable, of, throwError} from "rxjs";
import {Role, User} from "@core";
import {AngularFireAuth} from "@angular/fire/compat/auth";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {AngularFireFunctions} from "@angular/fire/compat/functions";
import {Router} from "@angular/router";
import {NotificationService} from "@core/service/notification.service";


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

  login(userName: string, password: string) {
    return from ( this.auth.signInWithEmailAndPassword( userName, password ) )
  }

  private getOrCreateCustomerForDoctor(doctorId: string): Observable<{ message: string }> {
    if (typeof doctorId !== 'string' || !doctorId.trim()) {
      return throwError(() => new Error('Invalid doctor id.'));
    }
    const callable = this.functions.httpsCallable<{ doctorId: string }, { message: string }>('getOrCreateCustomer');
    return callable({ doctorId: doctorId.trim() });
  }

  async signup(email: string, password: string, name: string, role: Role): Promise<void> {
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      if (userCredential?.user == null) {
        console.log('userCredential is null of undefined!!');
        return;
      }
      const user = userCredential.user;
      user.updateProfile({ displayName: name });
      const uid = user.uid;
      await this.firestore.collection('doctors').doc(uid).set({
        id: uid,
        role: role,
        name: name,
        email: email,
        secretaryDoctorId: '',
      });
      let localUser = new User();
      localUser.id = uid;
      localUser.role = role;
      localUser.name = name;
      localUser.email = email;
      localUser.plan = 'free';
      localUser.status = 'active';
      localUser.maxPatientsLimit = 2000;
      localUser.maxStorageLimitBytes = 200 * 1024 * 1024; // 200MB
      localUser.patientsCount = 0;
      localUser.storageBytesUsed = 0;
      this.currentUserSubject.next(localUser);
      firstValueFrom(this.getOrCreateCustomerForDoctor(uid));
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

  fireAuthUserToUser(fireUser: firebase.User) : User {
    return {
      id: fireUser!.uid!,
      img: fireUser!.photoURL!,
      email: fireUser!.email!,
      name: fireUser!.displayName!,
      secretaryDoctorId: '',
      role: Role.admin,
      education: '',
      about: '',
      experience: '',
      address: '',
      phoneNumber: '',
      plan: '',
      status: '',
      imgSize: 0,
      maxPatientsLimit: 0,
      maxStorageLimitBytes: 0,
      patientsCount: 0,
      storageBytesUsed: 0,
    }
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
        'Verification Link has been sent to your email!',
        'success',
        'center',
        true,
        false
      );
    } catch (error) {
      console.log(error)
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
    this.auth.authState.subscribe(fireAuthUser => {
      if (fireAuthUser) {
        // store user details local storage to keep user logged in between page refreshes
        this.firestore.collection('doctors').doc(fireAuthUser.uid).get()
        .subscribe((firebaseUser) => {
          if (firebaseUser.exists) {
            const firestoreUser: User = firebaseUser.data() as User;
            const localUser: User = this.fireAuthUserToUser(fireAuthUser);
            localUser.role = firestoreUser.role;
            localUser.phoneNumber = firestoreUser.phoneNumber;
            localUser.address = firestoreUser.address;
            localUser.education = firestoreUser.education;
            localUser.about = firestoreUser.about;
            localUser.experience = firestoreUser.experience;
            localUser.secretaryDoctorId = firestoreUser.secretaryDoctorId;
            localUser.plan = firestoreUser.plan;
            localUser.status = firestoreUser.status;
            localUser.imgSize = firestoreUser.imgSize;
            localUser.maxPatientsLimit = firestoreUser.maxPatientsLimit;
            localUser.maxStorageLimitBytes = firestoreUser.maxStorageLimitBytes;
            localUser.patientsCount = firestoreUser.patientsCount;
            localUser.storageBytesUsed = firestoreUser.storageBytesUsed;
            this.currentUserSubject.next(localUser);
            localStorage.setItem('currentUser', JSON.stringify(localUser));
            const isOnAuthPages =
              this.router.url === '/authentication/signup' ||
              this.router.url === '/authentication/signin' ||
              this.router.url === '/authentication/verify-email';

            if (isOnAuthPages) {
              if (fireAuthUser.emailVerified) {
                this.router.navigate(['/admin/dashboard/main']);
              } else {
                this.router.navigate(['/authentication/verify-email']);
              }
            }
            console.log('user logged in', JSON.stringify(localUser))
          }
        })
      } else {
        // remove user from local storage to log user out
        localStorage.removeItem('currentUser');
        this.router.navigate(['/authentication/signin']);
        console.log('user not logged in')
      }
    });
  }

}
