import {Injectable} from '@angular/core';
import {BehaviorSubject, from, Observable, of} from "rxjs";
import {Role, User} from "@core";
import {map} from "rxjs/operators";
import {AngularFireAuth} from "@angular/fire/compat/auth";
import firebase from "firebase/compat";
import {AngularFirestore} from "@angular/fire/compat/firestore";
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

  signup (email: string, password: string, name: string, role: Role) {
    return from (
      this.auth.createUserWithEmailAndPassword(email, password)
    ).pipe(
      map((userCredential) => {
          if (userCredential != null) {
            userCredential.user!.updateProfile({ displayName: name});
            // Save user role to firestore
            this.firestore.collection('doctors').doc(userCredential.user!.uid).set({
              id: userCredential.user!.uid,
              role: role,
              name: name,
              email: email,
            });
            this.sendEmailVerificationCode()
          } else {
              console.log('userCredential is null of undefined!!')
          }
          return;
      })
    );
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
          const firestoreUser: User = firebaseUser.data() as User;
          const localUser: User = this.fireAuthUserToUser(fireAuthUser);
          localUser.role = firestoreUser.role;
          localUser.phoneNumber = firestoreUser.phoneNumber;
          localUser.address = firestoreUser.address;
          localUser.education = firestoreUser.education;
          localUser.about = firestoreUser.about;
          localUser.experience = firestoreUser.experience;
          localUser.secretaryDoctorId = firestoreUser.secretaryDoctorId;
          this.currentUserSubject.next(localUser);
          localStorage.setItem('currentUser', JSON.stringify(localUser));
          // Redirect the user to dashboard page
          if (this.router.url === '/authentication/signin') {
            this.router.navigate(['/admin/dashboard/main']);
          }
          console.log('user logged in', JSON.stringify(localUser))
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
