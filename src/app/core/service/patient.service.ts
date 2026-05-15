import {Injectable} from '@angular/core';
import {BehaviorSubject, from} from 'rxjs';
import {Attachment, Patient, SpecialDiagrams} from '@core/models/patient.model';
import {UnsubscribeOnDestroyAdapter} from '@shared';
import {FirebaseAuthenticationService} from "../../authentication/services/firebase-authentication.service";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {AppointmentModel} from "@core/models/appointment.model";
import {PaymentModel} from "@core/models/payment.model";
import {TreatmentModel} from "@core/models/treatment.model";
import {isNullOrUndefined} from "@swimlane/ngx-datatable";
import * as firestore from "firebase/firestore";
import {User} from "@core";


@Injectable({
  providedIn: 'root',
})

export class PatientService extends UnsubscribeOnDestroyAdapter {
  isTblLoading = true;
  dataChange: BehaviorSubject<Patient[]> = new BehaviorSubject<Patient[]>([]);
  // Temporarily stores data from dialogs
  dialogData: Patient = new Patient;
  constructor(
    private firebaseAuthenticationService: FirebaseAuthenticationService,
    private firestore: AngularFirestore,
  ) {
    super();
  }
  get data(): Patient[] {
    return this.dataChange.value;
  }
  get doctor(): User {
    return this.firebaseAuthenticationService.currentUserValue;
  }
  getDialogData() {
    return this.dialogData;
  }
  getAllPatients(): void {
    const tempPatients : Patient[] = [];
    this.dataChange.next(tempPatients);
    const doctorId = this.doctor.id;

    this.subs.sink = from (this.firestore.collection('patients').ref.where('doctorId', '==', doctorId).get())
      .subscribe( {
        next: (patients) => {
          patients.docs.map( (patient) => {
              const tempPatient : Patient = patient.data() as Patient;
              tempPatients.push(tempPatient);
            }
          )
          this.isTblLoading = false;
          this.dataChange.next(tempPatients);
        },
        error: (error) => {
          this.isTblLoading = false;
          console.log('error: ' + JSON.stringify(error))
        }
      }
    );

  }
  async addPatient(patient: Patient): Promise<void> {
    patient.doctorId = this.doctor.id;
    patient.createdAt = firestore.Timestamp.now();
    this.dialogData = patient;

    // Add the patient to the local storage
    this.dataChange.value.unshift(patient);

    try {
      const result = await this.firestore.collection('patients').add({...patient});
      await this.firestore.collection('patients').doc(result.id).ref.update({id: result.id});
      patient.id = result.id;
      this.dialogData = patient;
      const foundIndex = this.dataChange.value.findIndex((x) => x.id === patient.id);
      if (foundIndex != null) {
        this.dataChange.value[foundIndex].id = result.id;
      } else {
        console.log('Error: Patient doesn\'t exist!!');
      }
      this.doctor.subscription.patientsCount++;
      console.log('patient ID: ' + JSON.stringify(result.id));
    } catch (error) {
      console.log('error: ' + JSON.stringify(error));
    }
  }

  updatePatient(patient: Patient): void {
    patient.id = this.getDialogData().id;
    patient.doctorId = this.getDialogData().doctorId;
    this.dialogData = patient;

    // Update patient on local storage
    const foundIndex = this.dataChange.value.findIndex(
      (x) => x.id === patient.id
    );
    if (foundIndex != null) {
      this.dataChange.value[foundIndex] = patient;
    } else {
      console.log('Error: Patient doesn\'t exist!!');
    }

    // Update patient on Firestore
    from (this.firestore.collection('patients').doc(patient.id).ref.update({...patient}))
      .subscribe( {
          error: (error) => {
            console.log('error: ' + JSON.stringify(error))
          }
      }
    );

  }
  
  deletePatient(patientId: string): void {

    const foundIndex = this.dataChange.value.findIndex(
      (x) => x.id === patientId
    );
    const foundPatient = this.dataChange.value[foundIndex];
    // loop throgh attachments and save the sum of their sizes
    let totalSize = 0;
    foundPatient.attachments.forEach(attachment => {
      totalSize += attachment.size;
    });
    // Add the patient's image size to the total size
    totalSize += foundPatient.imgSize;
    this.doctor.subscription.storageBytesUsed -= totalSize;
    this.doctor.subscription.patientsCount--;

    // Delete patient from local storage
    if (foundIndex != null) {
      this.dataChange.value.splice(foundIndex, 1);
    } else {
      console.log('Error: Patient doesn\'t exist!!');
    }

    // Delete patient from Firestore
    this.firestore.collection('patients').doc(patientId).delete()
  }

  addPatientAppointment(appointment: AppointmentModel) {
    appointment.patientId = this.getDialogData().id;
    appointment.doctorId = this.getDialogData().doctorId;

    const result = this.firestore.collection('appointments').add( {...appointment} );
    from(result).subscribe({
        next: (result) => {
          this.firestore.collection('appointments').doc(result.id).update({id: result.id});
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

  updateAdultTeethDiagramToothNote(toothId: string, toothNote: string) {

    // Update note if it added before, if not, add new note.
    const foundToothIndex = this.getDialogData().specialDiagrams.adultTeethDiagram.findIndex((tooth) => !isNullOrUndefined(tooth[toothId]));
    if (!isNullOrUndefined(foundToothIndex) && foundToothIndex != -1) {
      this.getDialogData().specialDiagrams.adultTeethDiagram[foundToothIndex] = {[toothId]: toothNote};
    } else {
      this.getDialogData().specialDiagrams.adultTeethDiagram.push({[toothId]: toothNote});
    }

    const newSpecialDiagrams: SpecialDiagrams = this.getDialogData().specialDiagrams;
    return this.firestore.collection('patients').doc(this.getDialogData().id).ref.update( {specialDiagrams: newSpecialDiagrams} );
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
