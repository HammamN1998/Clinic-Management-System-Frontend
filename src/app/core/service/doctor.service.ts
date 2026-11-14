import {Injectable} from '@angular/core';
import {FirebaseAuthenticationService} from "../../authentication/services/firebase-authentication.service";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {from} from "rxjs";
import * as firestore from "firebase/firestore";
import {ClinicContextService} from "@core/service/clinic-context.service";
@Injectable({
  providedIn: 'root'
})
export class DoctorService {

  constructor(
    private firebaseAuthenticationService: FirebaseAuthenticationService,
    private firestore: AngularFirestore,
    private clinicContext: ClinicContextService,
  ) { }

  /** The signed-in user. Their own doctor document is the only one they may edit. */
  get doctor() {
    return this.firebaseAuthenticationService.currentUserValue;
  }

  /** Owner of the records on screen: the signed-in doctor, or the linked doctor a clinic admin is working in. */
  get activeDoctorId(): string {
    return this.clinicContext.activeDoctor?.id ?? this.doctor.id;
  }

  editDoctor (data: {[p:string]: string | number}) {
    Object.assign(this.doctor, data);
    this.firebaseAuthenticationService.persistCurrentUser();
    return this.firestore.collection('doctors').doc(this.doctor.id).update(data);
  }

  /** Unlike `editDoctor`, local state changes only after Firestore accepts the write, so a failure never looks saved. */
  async setDefaultAppointmentDuration(minutes: number): Promise<void> {
    await this.firestore.collection('doctors').doc(this.doctor.id).update({ defaultAppointmentDuration: minutes });
    this.doctor.defaultAppointmentDuration = minutes;
    this.firebaseAuthenticationService.persistCurrentUser();
  }

  getCurrentMonthAppointments() {
    const now = new Date();
    const startOfMonth = firestore.Timestamp.fromDate( new Date(now.getFullYear(), now.getMonth(), 1));
    const endOfMonth = firestore.Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    return this.firestore.collection('appointments').ref
    .where('doctorId', '==', this.activeDoctorId)
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
    .where('doctorId', '==', this.activeDoctorId)
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
    .where('doctorId', '==', this.activeDoctorId)
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
      .where('doctorId', '==', this.activeDoctorId)
      .where('date', '>=', startOfMonth)
      .where('date', '<', endOfMonth)
      .orderBy('date', 'asc')
      .get()
  }

  getAppointmentsByRange(start: Date, end: Date) {
    const startTimestamp = firestore.Timestamp.fromDate(start);
    const endTimestamp = firestore.Timestamp.fromDate(end);
    return this.firestore.collection('appointments').ref
      .where('doctorId', '==', this.activeDoctorId)
      .where('date', '>=', startTimestamp)
      .where('date', '<', endTimestamp)
      .orderBy('date', 'asc')
      .get();
  }

  getTreatmentsByRange(start: Date, end: Date) {
    const startTimestamp = firestore.Timestamp.fromDate(start);
    const endTimestamp = firestore.Timestamp.fromDate(end);
    return this.firestore.collection('treatments').ref
      .where('doctorId', '==', this.activeDoctorId)
      .where('date', '>=', startTimestamp)
      .where('date', '<', endTimestamp)
      .orderBy('date', 'asc')
      .get();
  }

  getNewPatientsByRange(start: Date, end: Date) {
    const startTimestamp = firestore.Timestamp.fromDate(start);
    const endTimestamp = firestore.Timestamp.fromDate(end);
    return this.firestore.collection('patients').ref
      .where('doctorId', '==', this.activeDoctorId)
      .where('createdAt', '>=', startTimestamp)
      .where('createdAt', '<', endTimestamp)
      .orderBy('createdAt', 'asc')
      .get();
  }

  getPaymentsByRange(start: Date, end: Date) {
    const startTimestamp = firestore.Timestamp.fromDate(start);
    const endTimestamp = firestore.Timestamp.fromDate(end);
    return this.firestore.collection('payments').ref
      .where('doctorId', '==', this.activeDoctorId)
      .where('date', '>=', startTimestamp)
      .where('date', '<', endTimestamp)
      .orderBy('date', 'asc')
      .get();
  }

}
