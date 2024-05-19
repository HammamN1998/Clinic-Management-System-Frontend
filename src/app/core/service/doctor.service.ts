import { Injectable } from '@angular/core';
import {FirebaseAuthenticationService} from "../../authentication/services/firebase-authentication.service";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {from} from "rxjs";
import * as firestore from "firebase/firestore";
import {AppointmentModel} from "@core/models/appointment.model";



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

  getCurrentMonthAppointments() {
    const now = new Date();
    const startOfMonth = firestore.Timestamp.fromDate( new Date(now.getFullYear(), now.getMonth(), 1));
    const endOfMonth = firestore.Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    return this.firestore.collection('appointments').ref
    .where('doctorId', '==', this.firebaseAuthenticationService.currentUserValue.id)
    .where('date', '>=', startOfMonth)
    .where('date', '<', endOfMonth)
    .orderBy('date', 'asc')
    .get()
  }

  getCurrentMonthTreatments() {
    const now = new Date();
    const startOfMonth = firestore.Timestamp.fromDate( new Date(now.getFullYear(), now.getMonth(), 1));
    const endOfMonth = firestore.Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    return this.firestore.collection('treatments').ref
    .where('doctorId', '==', this.firebaseAuthenticationService.currentUserValue.id)
    .where('date', '>=', startOfMonth)
    .where('date', '<', endOfMonth)
    .orderBy('date', 'asc')
    .get()
  }

  getCurrentMonthNewPatients() {
    const now = new Date();
    const startOfMonth = firestore.Timestamp.fromDate( new Date(now.getFullYear(), now.getMonth(), 1));
    const endOfMonth = firestore.Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    return this.firestore.collection('patients').ref
    .where('doctorId', '==', this.firebaseAuthenticationService.currentUserValue.id)
    .where('createdAt', '>=', startOfMonth)
    .where('createdAt', '<', endOfMonth)
    .orderBy('createdAt', 'asc')
    .get()
  }

  getCurrentMonthPayments() {
    const now = new Date();
    const startOfMonth = firestore.Timestamp.fromDate( new Date(now.getFullYear(), now.getMonth(), 1));
    const endOfMonth = firestore.Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    return this.firestore.collection('payments').ref
      .where('doctorId', '==', this.firebaseAuthenticationService.currentUserValue.id)
      .where('date', '>=', startOfMonth)
      .where('date', '<', endOfMonth)
      .orderBy('date', 'asc')
      .get()
  }

}
