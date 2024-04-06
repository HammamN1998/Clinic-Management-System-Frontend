import {Injectable} from '@angular/core';
import {BehaviorSubject, from, Observable, of} from "rxjs";
import {Role, User} from "@core";
import {map} from "rxjs/operators";
import {AngularFireAuth} from "@angular/fire/compat/auth";
import firebase from "firebase/compat";
import UserCredential = firebase.auth.UserCredential;


@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthenticationService {

  private currentUserSubject: BehaviorSubject<User>;
  public currentUser: Observable<User>;

  constructor(
    private auth: AngularFireAuth
  ) {

    this.currentUserSubject = new BehaviorSubject<User>(
        JSON.parse(localStorage.getItem('currentUser') || '{}')
    );
    this.currentUser = this.currentUserSubject.asObservable();

  }
  public get currentUserValue(): User {
      return this.currentUserSubject.value;
  }

  login(userName: string, password: string) {
      let user: User;
      return from (
          this.auth.signInWithEmailAndPassword( userName, password )
      ).pipe(
          map((userCredential) => {
              if (userCredential != null) {
                  console.log('login credentials: ' + JSON.stringify(userCredential));
                  // Assign userCredential to user:User
                  user = this.firebaseUserCredentialToUser(userCredential);
                  // store user details and jwt token in local storage to keep user logged in between page refreshes
                  localStorage.setItem('currentUser', JSON.stringify(user));
                  this.currentUserSubject.next(user);
              } else {
                console.log('userCredential is null of undefined!!')
              }

              return user;
          })
      );
  }

  signup (userName: string, password: string, displayName: string) {
    let user: User;
    return from (
      this.auth.createUserWithEmailAndPassword(userName, password)
    ).pipe(
      map((userCredential) => {
          if (userCredential != null) {
              console.log('displayName: ' + displayName);
              userCredential.user!.updateProfile({ displayName: displayName});
              // Assign userCredential to user:User
              user = this.firebaseUserCredentialToUser(userCredential);
              // store user details and jwt token in local storage to keep user logged in between page refreshes
              localStorage.setItem('currentUser', JSON.stringify(user));
              this.currentUserSubject.next(user);

          } else {
              console.log('userCredential is null of undefined!!')
          }

          return user;
      })
    );
  }

  logout() {
      // remove user from local storage to log user out
      localStorage.removeItem('currentUser');
      this.currentUserSubject.next(this.currentUserValue);
      return of({ success: false });
  }

  firebaseUserCredentialToUser(fireUserCredential: UserCredential) : User {
    return {
        id: parseInt(fireUserCredential!.user!.uid!),
        img: fireUserCredential!.user!.photoURL!,
        username: fireUserCredential!.user!.email!,
        firstName: fireUserCredential!.user!.displayName!,
        lastName: '',
        role: Role.Admin,
        token: fireUserCredential!.user!.refreshToken!,
        password: ''
    }
  }

}
