import {Injectable} from '@angular/core';
import {from, Observable} from 'rxjs';
import {Attachment, Patient} from '@core/models/patient.model';
import {UnsubscribeOnDestroyAdapter} from '@shared';
import {FirebaseAuthenticationService} from "../../authentication/services/firebase-authentication.service";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {AppointmentModel} from "@core/models/appointment.model";
import {PaymentModel} from "@core/models/payment.model";
import {TreatmentModel} from "@core/models/treatment.model";
import {isNullOrUndefined} from "@swimlane/ngx-datatable";
import * as firestore from "firebase/firestore";
import {User} from "@core";
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import {Router} from "@angular/router";
import {TranslateService} from "@ngx-translate/core";
import {NotificationService} from "@core/service/notification.service";
import {OnboardingService} from "@core/service/onboarding.service";
import {Direction} from "@angular/cdk/bidi";
import {MatDialog} from "@angular/material/dialog";
import {
  DuplicatePhoneDialogComponent,
  DuplicatePhoneDialogResult,
} from "../../admin/patients/allpatients/dialog/duplicate-phone-dialog/duplicate-phone-dialog.component";

export interface PatientsPageResult {
  patients: Patient[];
  lastDoc: firebase.firestore.QueryDocumentSnapshot | null;
}

@Injectable({
  providedIn: 'root',
})

export class PatientService extends UnsubscribeOnDestroyAdapter {
  private patientsPageCursors = new Map<number, firebase.firestore.QueryDocumentSnapshot>();
  // Temporarily stores data from dialogs
  dialogData: Patient = new Patient;
  constructor(
    private firebaseAuthenticationService: FirebaseAuthenticationService,
    private firestore: AngularFirestore,
    private notificationService: NotificationService,
    private router: Router,
    private translate: TranslateService,
    private onboardingService: OnboardingService,
    private dialog: MatDialog,
  ) {
    super();
  }
  get doctor(): User {
    return this.firebaseAuthenticationService.currentUserValue;
  }
  getDialogData() {
    return this.dialogData;
  }

  clearPatientsPageCursors(): void {
    this.patientsPageCursors.clear();
  }

  getPatientsPage(
    pageIndex: number,
    pageSize: number
  ): Observable<PatientsPageResult> {
    return from(this.fetchPatientsPage(pageIndex, pageSize));
  }

  async getAllPatientsForExport(): Promise<Patient[]> {
    const snapshot = await this.firestore.collection('patients').ref
      .where('doctorId', '==', this.doctor.id)
      .get();
    return snapshot.docs.map((doc) => doc.data() as Patient);
  }

  private async fetchPatientsPageRaw(
    pageSize: number,
    startAfterDoc?: firebase.firestore.QueryDocumentSnapshot
  ): Promise<PatientsPageResult> {
    const safePageSize = Math.max(1, pageSize || 10);
    let query = this.firestore.collection('patients').ref
      .where('doctorId', '==', this.doctor.id)
      .orderBy('createdAt', 'desc')
      .limit(safePageSize);
    if (startAfterDoc) {
      query = query.startAfter(startAfterDoc);
    }
    const snapshot = await query.get();
    const patients = snapshot.docs.map((doc) => doc.data() as Patient);
    const lastDoc = snapshot.docs.length > 0
      ? snapshot.docs[snapshot.docs.length - 1] as firebase.firestore.QueryDocumentSnapshot
      : null;
    return { patients, lastDoc };
  }

  private async ensureCursorsUpTo(
    targetPageIndex: number,
    pageSize: number
  ): Promise<void> {
    if (targetPageIndex === 0 || this.patientsPageCursors.has(targetPageIndex)) {
      return;
    }

    let startFromPage = 0;
    for (let page = targetPageIndex; page >= 1; page--) {
      if (this.patientsPageCursors.has(page)) {
        startFromPage = page;
        break;
      }
    }

    for (let page = startFromPage; page < targetPageIndex; page++) {
      const cursor = page > 0 ? this.patientsPageCursors.get(page) : undefined;
      const result = await this.fetchPatientsPageRaw(pageSize, cursor);
      if (result.lastDoc) {
        this.patientsPageCursors.set(page + 1, result.lastDoc);
      } else {
        break;
      }
    }
  }

  private async fetchPatientsPage(
    pageIndex: number,
    pageSize: number
  ): Promise<PatientsPageResult> {
    await this.ensureCursorsUpTo(pageIndex, pageSize);
    const cursor = pageIndex > 0 ? this.patientsPageCursors.get(pageIndex) : undefined;
    const result = await this.fetchPatientsPageRaw(pageSize, cursor);
    if (result.lastDoc) {
      this.patientsPageCursors.set(pageIndex + 1, result.lastDoc);
    }
    return result;
  }

  async findPatientsByPhoneNumber(phoneNumber: string): Promise<Patient[]> {
    const normalized = String(phoneNumber ?? '').trim();
    if (!normalized) {
      return [];
    }

    const snapshot = await this.firestore.collection('patients').ref
      .where('doctorId', '==', this.doctor.id)
      .where('phoneNumber', '==', normalized)
      .limit(20)
      .get();

    return snapshot.docs.map((doc) => doc.data() as Patient);
  }

  async checkBeforeAdd(
    phoneNumber: string,
    onContinueAdd: () => void | Promise<void>,
  ): Promise<void> {
    const normalized = String(phoneNumber ?? '').trim();
    const existing = await this.findPatientsByPhoneNumber(normalized);
    if (existing.length === 0) {
      await onContinueAdd();
      return;
    }

    const direction: Direction = localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';
    const dialogRef = this.dialog.open(DuplicatePhoneDialogComponent, {
      data: { phoneNumber: normalized, patients: existing },
      direction,
      width: '440px',
      maxWidth: '95vw',
    });

    dialogRef.afterClosed().subscribe((result: DuplicatePhoneDialogResult | undefined) => {
      if (!result) {
        return;
      }
      if (result.action === 'navigate') {
        this.dialogData = result.patient;
        void this.router.navigate(['/admin/patients/patient-profile']);
      } else if (result.action === 'continue') {
        void onContinueAdd();
      }
    });
  }

  async addPatient(patient: Patient): Promise<void> {
    patient.doctorId = this.doctor.id;
    patient.createdAt = firestore.Timestamp.now();
    this.dialogData = patient;

    try {
      const wasFirstPatient = (this.doctor.subscription?.patientsCount ?? 0) === 0;
      const result = await this.firestore.collection('patients').add({...patient});
      await this.firestore.collection('patients').doc(result.id).ref.update({id: result.id});
      patient.id = result.id;
      this.dialogData = patient;
      this.doctor.subscription.patientsCount++;
      this.onboardingService.recordPatientAdded(wasFirstPatient);
      console.log('patient ID: ' + JSON.stringify(result.id));
    } catch (error) {
      console.log('error: ' + JSON.stringify(error));
    }
  }

  updatePatient(patient: Patient): void {
    patient.id = this.getDialogData().id;
    patient.doctorId = this.getDialogData().doctorId;
    this.dialogData = patient;

    from(this.firestore.collection('patients').doc(patient.id).ref.update({...patient}))
      .subscribe({
        error: (error) => {
          console.log('error: ' + JSON.stringify(error));
        },
      });
  }

  async deletePatient(patientId: string): Promise<void> {
    const doc = await this.firestore.collection('patients').doc(patientId).ref.get();
    if (!doc.exists) {
      console.log('Error: Patient doesn\'t exist!!');
      return;
    }

    const foundPatient = doc.data() as Patient;
    let totalSize = 0;
    (foundPatient.attachments ?? []).forEach((attachment: Attachment) => {
      totalSize += attachment.size;
    });
    totalSize += foundPatient.imgSize ?? 0;
    this.doctor.subscription.storageBytesUsed -= totalSize;
    this.doctor.subscription.patientsCount--;

    await this.firestore.collection('patients').doc(patientId).delete();
  }

  addPatientAppointment(appointment: AppointmentModel) {
    appointment.patientId = this.getDialogData().id;
    appointment.doctorId = this.getDialogData().doctorId;

    const result = this.firestore.collection('appointments').add( {...appointment} );
    from(result).subscribe({
        next: (result) => {
          this.firestore.collection('appointments').doc(result.id).update({id: result.id});
          this.onboardingService.recordAppointmentCreated();
        },
        error: (error) => {
          console.log('error: ' + error)
        }
      }
    )
    return result;
  }

  addPatientPayment(payment: PaymentModel) {
    payment.patientId = this.getDialogData().id;
    payment.doctorId = this.getDialogData().doctorId;

    const result = this.firestore.collection('payments').add( {...payment} );
    from(result).subscribe({
        next: (result) => {
          this.firestore.collection('payments').doc(result.id).update({id: result.id});
        },
        error: (error) => {
          console.log('error: ' + error)
        }
      }
    )
    return result;
  }

  addPatientTreatment(treatment: TreatmentModel) {
    treatment.patientId = this.getDialogData().id;
    treatment.doctorId = this.getDialogData().doctorId;

    const result = this.firestore.collection('treatments').add( {...treatment} );
    from(result).subscribe({
        next: (result) => {
          this.firestore.collection('treatments').doc(result.id).update({id: result.id});
        },
        error: (error) => {
          console.log('error: ' + error)
        }
      }
    )
    return result;
  }

  getPatientAppointments() {
    return this.firestore.collection('appointments').ref
    .where('doctorId', '==', this.doctor.id)
    .where('patientId', '==', this.getDialogData().id)
    .orderBy('date', 'desc')
    .orderBy('time', 'desc')
    .get();
  }

  async getAppointmentsByPatientIds(patientIds: string[]): Promise<Record<string, AppointmentModel[]>> {
    const uniqueIds = Array.from(new Set(patientIds.filter(Boolean)));
    const appointmentsByPatientId: Record<string, AppointmentModel[]> = {};
    for (const patientId of uniqueIds) {
      const snapshot = await this.firestore
        .collection('appointments')
        .ref
        .where('doctorId', '==', this.doctor.id)
        .where('patientId', '==', patientId)
        .get();
      appointmentsByPatientId[patientId] = snapshot.docs.map(
        (doc) => doc.data() as AppointmentModel
      );
    }
    return appointmentsByPatientId;
  }

  async getPaymentsByPatientIds(patientIds: string[]): Promise<Record<string, PaymentModel[]>> {
    const uniqueIds = Array.from(new Set(patientIds.filter(Boolean)));
    const paymentsByPatientId: Record<string, PaymentModel[]> = {};
    for (const patientId of uniqueIds) {
      const snapshot = await this.firestore
        .collection('payments')
        .ref
        .where('doctorId', '==', this.doctor.id)
        .where('patientId', '==', patientId)
        .get();
      paymentsByPatientId[patientId] = snapshot.docs.map(
        (doc) => doc.data() as PaymentModel
      );
    }
    return paymentsByPatientId;
  }

  async getTreatmentsByPatientIds(patientIds: string[]): Promise<Record<string, TreatmentModel[]>> {
    const uniqueIds = Array.from(new Set(patientIds.filter(Boolean)));
    const treatmentsByPatientId: Record<string, TreatmentModel[]> = {};
    for (const patientId of uniqueIds) {
      const snapshot = await this.firestore
        .collection('treatments')
        .ref
        .where('doctorId', '==', this.doctor.id)
        .where('patientId', '==', patientId)
        .get();
      treatmentsByPatientId[patientId] = snapshot.docs.map(
        (doc) => doc.data() as TreatmentModel
      );
    }
    return treatmentsByPatientId;
  }

  getPatientPayments() {
    return this.firestore.collection('payments').ref
    .where('doctorId', '==', this.doctor.id)
    .where('patientId', '==', this.getDialogData().id)
    .orderBy('date', 'desc')
    .get();
  }

  getPatientTreatments() {
    return this.firestore.collection('treatments').ref
    .where('doctorId', '==', this.doctor.id)
    .where('patientId', '==', this.getDialogData().id)
    .orderBy('date', 'desc')
    .get();
  }

  changeAppointmentAttended(appointment: AppointmentModel, attended: boolean) {
    return this.firestore.collection('appointments').doc(appointment.id).update({attended: attended});
  }

  changeAppointmentCostPaid(appointment: AppointmentModel, costPaid: boolean) {
    return this.firestore.collection('appointments').doc(appointment.id).update({costPaid: costPaid});
  }

  updateAppointmentDetails(appointment: AppointmentModel) {
    return from(
      this.firestore.collection('appointments')
        .doc(appointment.id)
        .update({details: appointment.details})
    );
  }

  updateAppointmentPrescriptions(appointment: AppointmentModel) {
    return from(
      this.firestore.collection('appointments')
        .doc(appointment.id)
        .update({prescriptions: appointment.prescriptions || []})
    );
  }

  updateAppointmentSoap(
    appointmentId: string,
    patch: Partial<
      Pick<AppointmentModel, 'subjective' | 'objective' | 'assessment' | 'plan'>
    >
  ) {
    return from(
      this.firestore.collection('appointments').doc(appointmentId).update(patch)
    );
  }

  updatePaymentDetails(payment: PaymentModel) {
    return from(
      this.firestore.collection('payments')
        .doc(payment.id)
        .update({details: payment.details})
    );
  }

  updateTreatmentDetails(treatment: TreatmentModel) {
    return from(
      this.firestore.collection('treatments')
        .doc(treatment.id)
        .update({details: treatment.details})
    );
  }

  deleteAppointment(id: string) {
    return this.firestore.collection('appointments').doc(id).delete();
  }

  deletePayment(id: string) {
    return this.firestore.collection('payments').doc(id).delete();
  }

  deleteTreatment(id: string) {
    return this.firestore.collection('treatments').doc(id).delete();
  }

  getPatientInfo(patientId: string) {
    return this.firestore.collection('patients').doc(patientId).get();
  }

  updatePatientNotes(notes: string) {
    const patientID = this.getDialogData().id;

    // Update patient on Firestore
    from (this.firestore.collection('patients').doc(patientID).ref.update({'notes': notes}))
      .subscribe( {
          error: (error) => {
            console.log('error: ' + JSON.stringify(error))
          }
        }
      );
  }
}
