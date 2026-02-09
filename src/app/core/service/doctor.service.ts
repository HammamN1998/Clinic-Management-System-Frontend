import {Injectable} from '@angular/core';
import {FirebaseAuthenticationService} from "../../authentication/services/firebase-authentication.service";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {from} from "rxjs";
import * as firestore from "firebase/firestore";
import {Role} from "@core";

@Injectable({
  providedIn: 'root'
})
export class DoctorService {

  constructor(
    private firebaseAuthenticationService: FirebaseAuthenticationService,
    private firestore: AngularFirestore,
  ) { }

  get doctor() {
    return this.firebaseAuthenticationService.currentUserValue;
  }

  private getDoctorId() {
    return this.doctor.role === Role.secretary ? this.doctor.secretaryDoctorId : this.doctor.id;
  }

  editDoctor (data: {[p:string]: string}) {
    return this.firestore.collection('doctors').doc(this.doctor.id).update(data);
  }

  getDoctorSecretaries() {
    return this.firestore.collection('doctors').ref
    .where('role', '==', 'secretary')
    .where('secretaryDoctorId', '==', this.doctor.id)
    .get();
  }



  connectSecretary(secretaryEmail: string) {
    const result = this.firestore.collection('doctors').ref.where('email', '==', secretaryEmail).get();
    from(result)
    .subscribe({
      next: (secretary) => {
        if (secretary.size > 1) console.log('error: multiple doctors with same email!!')
        secretary.docs.forEach((secretary) => {
          secretary.ref.update({secretaryDoctorId: this.doctor.id})
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
        next: (secretary) => {
          if (secretary.size > 1) console.log('error: multiple doctors with same email!!')
          secretary.docs.forEach((secretary) => {
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
    const doctorId =  this.getDoctorId();
    return this.firestore.collection('appointments').ref
    .where('doctorId', '==', doctorId)
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
    .where('doctorId', '==', this.doctor.id)
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
    .where('doctorId', '==', this.doctor.id)
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
      .where('doctorId', '==', this.doctor.id)
      .where('date', '>=', startOfMonth)
      .where('date', '<', endOfMonth)
      .orderBy('date', 'asc')
      .get()
  }

  getAppointmentsByRange(start: Date, end: Date) {
    const startTimestamp = firestore.Timestamp.fromDate(start);
    const endTimestamp = firestore.Timestamp.fromDate(end);
    return this.firestore.collection('appointments').ref
      .where('doctorId', '==', this.getDoctorId())
      .where('date', '>=', startTimestamp)
      .where('date', '<', endTimestamp)
      .orderBy('date', 'asc')
      .get();
  }

  getTreatmentsByRange(start: Date, end: Date) {
    const startTimestamp = firestore.Timestamp.fromDate(start);
    const endTimestamp = firestore.Timestamp.fromDate(end);
    return this.firestore.collection('treatments').ref
      .where('doctorId', '==', this.getDoctorId())
      .where('date', '>=', startTimestamp)
      .where('date', '<', endTimestamp)
      .orderBy('date', 'asc')
      .get();
  }

  getNewPatientsByRange(start: Date, end: Date) {
    const startTimestamp = firestore.Timestamp.fromDate(start);
    const endTimestamp = firestore.Timestamp.fromDate(end);
    return this.firestore.collection('patients').ref
      .where('doctorId', '==', this.getDoctorId())
      .where('createdAt', '>=', startTimestamp)
      .where('createdAt', '<', endTimestamp)
      .orderBy('createdAt', 'asc')
      .get();
  }

  getPaymentsByRange(start: Date, end: Date) {
    const startTimestamp = firestore.Timestamp.fromDate(start);
    const endTimestamp = firestore.Timestamp.fromDate(end);
    return this.firestore.collection('payments').ref
      .where('doctorId', '==', this.getDoctorId())
      .where('date', '>=', startTimestamp)
      .where('date', '<', endTimestamp)
      .orderBy('date', 'asc')
      .get();
  }

}
