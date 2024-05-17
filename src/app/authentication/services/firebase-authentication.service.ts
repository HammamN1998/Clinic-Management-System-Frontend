import {Injectable} from '@angular/core';
import {BehaviorSubject, from, Observable, of} from "rxjs";
import {Role, User} from "@core";
import {map} from "rxjs/operators";
import {AngularFireAuth} from "@angular/fire/compat/auth";
import firebase from "firebase/compat";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {Router} from "@angular/router";


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
            });
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

  firebaseUserToUser(fireUser: firebase.User, role: Role = Role.admin) : User {
    return {
      id: fireUser!.uid!,
      img: fireUser!.photoURL!,
      email: fireUser!.email!,
      name: fireUser!.displayName!,
      role: role,
      secretaryDoctorId: '',
    }
  }

  traceAuthenticationStatus() {
    // Put this snippet of code on a separate method because constructor cant handle Observer correctly.
    this.auth.authState.subscribe(user => {
      if (user) {
        // store user details local storage to keep user logged in between page refreshes
        this.firestore.collection('doctors').doc(user.uid).get()
        .subscribe((firebaseUser) => {
          const localUser: User = this.firebaseUserToUser(user);
          localUser.role = (firebaseUser.data()! as User).role;
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
