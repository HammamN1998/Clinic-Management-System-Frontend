import { Injectable } from '@angular/core';
import {FirebaseAuthenticationService} from "../../authentication/services/firebase-authentication.service";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {from} from "rxjs";


@Injectable({
  providedIn: 'root'
})
export class DoctorService {

  constructor(
    private firebaseAuthenticationService: FirebaseAuthenticationService,
    private firestore: AngularFirestore,
  ) { }

  editDoctor (data: {[p:string]: string}) {
    return this.firestore.collection('doctors').doc(this.firebaseAuthenticationService.currentUserValue.id).update(data);
  }

  getDoctorSecretaries() {
    return this.firestore.collection('doctors').ref
    .where('role', '==', 'secretary')
    .where('secretaryDoctorId', '==', this.firebaseAuthenticationService.currentUserValue.id)
    .get();
  }

  connectSecretary(secretaryEmail: string) {
    const result = this.firestore.collection('doctors').ref.where('email', '==', secretaryEmail).get();
    from(result)
    .subscribe({
      next: (secretaries) => {
        if (secretaries.size > 1) console.log('error: multiple doctors with same email!!')
        secretaries.docs.forEach((secretary) => {
          secretary.ref.update({secretaryDoctorId: this.firebaseAuthenticationService.currentUserValue.id})
        })
      },
      error: (error) => {
        console.log('error: ' + error);
      }
    })
    return result
  }

  disconnectSecretary(secretaryEmail: string) {
    const result = this.firestore.collection('doctors').ref.where('email', '==', secretaryEmail).get();
    from(result)
      .subscribe({
        next: (secretaries) => {
          if (secretaries.size > 1) console.log('error: multiple doctors with same email!!')
          secretaries.docs.forEach((secretary) => {
            secretary.ref.update({secretaryDoctorId: ''})
          })
        },
        error: (error) => {
          console.log('error: ' + error);
        }
      })
    return result
  }
}
