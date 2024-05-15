import {Injectable} from '@angular/core';
import {BehaviorSubject, from, Observable, of} from "rxjs";
import {Role, User} from "@core";
import {map} from "rxjs/operators";
import {AngularFireAuth} from "@angular/fire/compat/auth";
import firebase from "firebase/compat";


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

    this.traceAuthenticationStatus();

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
                  // Assign userCredential to user:User
                  user = this.firebaseUserToUser(userCredential.user!);
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

  signup (email: string, password: string, displayName: string) {
    let user: User;
    return from (
      this.auth.createUserWithEmailAndPassword(email, password)
    ).pipe(
      map((userCredential) => {
          if (userCredential != null) {
              userCredential.user!.updateProfile({ displayName: displayName});
              // Assign userCredential to user:User
              user = this.firebaseUserToUser(userCredential.user!);
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
    this.auth.signOut();
    // remove user from local storage to log user out
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(this.currentUserValue);
    return of({ success: false });
  }

  firebaseUserToUser(fireUser: firebase.User) : User {
    return {
        id: fireUser!.uid!,
        img: fireUser!.photoURL!,
        email: fireUser!.email!,
        name: fireUser!.displayName!,
        role: Role.Admin,
        token: fireUser!.refreshToken!,
    }
  }

  traceAuthenticationStatus() {
    // Put this snippet of code on a separate method because constructor code can be run only once
    this.auth.authState.subscribe(user => {
      if (user) {
        const localUser: User = this.firebaseUserToUser(user);
        // store user details and jwt token in local storage to keep user logged in between page refreshes
        localStorage.setItem('currentUser', JSON.stringify(localUser));
        this.currentUserSubject.next(localUser);

        console.log('user logged in', JSON.stringify(localUser))
      } else {
        console.log('user not logged in')
      }
    });
  }

}
