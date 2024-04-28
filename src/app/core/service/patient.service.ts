import { Injectable } from '@angular/core';
import {BehaviorSubject, from} from 'rxjs';
import { Patient } from '@core/models/patient.model';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import {FirebaseAuthenticationService} from "../../authentication/services/firebase-authentication.service";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {DateService} from "@core/service/date.service";
import {AppointmentModel} from "@core/models/appointment.model";

@Injectable({
  providedIn: 'root',
})

export class PatientService extends UnsubscribeOnDestroyAdapter {
  private readonly API_URL = 'assets/data/patient.json';
  isTblLoading = true;
  dataChange: BehaviorSubject<Patient[]> = new BehaviorSubject<Patient[]>([]);
  // Temporarily stores data from dialogs
  dialogData: Patient = {} as Patient;
  constructor(
    private dateService: DateService,
    private firebaseAuthenticationService: FirebaseAuthenticationService,
    private firestore: AngularFirestore,
  ) {
    super();
  }
  get data(): Patient[] {
    return this.dataChange.value;
  }
  getDialogData() {
    return this.dialogData;
  }
  getAllPatients(): void {
    const tempPatients : Patient[] = [];
    this.dataChange.next(tempPatients);

    this.subs.sink = from (this.firestore.collection('patients').ref.where('doctorId', '==', this.firebaseAuthenticationService.currentUserValue.id).get())
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
  addPatient(patient: Patient) {
    patient.birthDate = this.dateService.formatDateToISO8601(new Date(patient.birthDate));
    patient.doctorId  = this.firebaseAuthenticationService.currentUserValue.id;
    this.dialogData = patient;

    // Add the patient to the local storage
    this.dataChange.value.unshift(patient);

    // Add the patient and patient ID to the Firestore, and patient ID to local storage
    from (this.firestore.collection('patients').add(patient))
      .subscribe( {
        next: (result) => {
          // Update patient.id on Firestore
          from (this.firestore.collection('patients').doc(result.id).ref.update({id: result.id}))
            .subscribe( {
              next: () => {
                // Update patient.id on local storage
                patient.id = result.id;
                this.dialogData = patient;
                const foundIndex = this.dataChange.value.findIndex(
                  (x) => x.id === patient.id
                );
                if (foundIndex != null) {
                  this.dataChange.value[foundIndex].id = result.id;
                } else {
                  console.log('Error: Patient doesn\'t exist!!');
                }
              },
              error: (error) => {
                console.log('error: ' + JSON.stringify(error))
              }
            }
          );
          console.log('patient ID: ' + JSON.stringify(result.id));
        },
        error: (error) => {
          console.log('error: ' + JSON.stringify(error))
        }
      }
    );
  }
  updatePatient(patient: Patient): void {
    patient.birthDate = this.dateService.formatDateToISO8601(new Date(patient.birthDate));
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
    from (this.firestore.collection('patients').doc(patient.id).ref.update(patient))
      .subscribe( {
          error: (error) => {
            console.log('error: ' + JSON.stringify(error))
          }
      }
    );

  }
  deletePatient(patientId: string): void {

    // Delete patient from local storage
    const foundIndex = this.dataChange.value.findIndex(
      (x) => x.id === patientId
    );
    if (foundIndex != null) {
      this.dataChange.value.splice(foundIndex, 1);
    } else {
      console.log('Error: Patient doesn\'t exist!!');
    }

    // Delete patient from Firestore
    from(this.firestore.collection('patients').doc(patientId).delete())
      .subscribe({
        error: (error) => {
          console.log('Error: ' + JSON.stringify(error))
        }
      })
  }

  addPatientAppointment(appointment: AppointmentModel) {
    appointment.patientId = this.getDialogData().id;
    appointment.doctorId = this.getDialogData().doctorId;
    appointment.date = this.dateService.formatDateToISO8601(new Date(appointment.date));
    appointment.time = this.dateService.formatTimeToISO8601(new Date(appointment.time));

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
  getPatientAppointments() {
    return this.firestore.collection('appointments').ref
    .where('patientId', '==', this.getDialogData().id)
    .orderBy('date', 'desc')
    .orderBy('time', 'desc')
    .get();
  }

  changeAppointmentAttended(appointment: AppointmentModel, attended: string) {
    return this.firestore.collection('appointments').doc(appointment.id).update({attended: attended});
  }

  deleteAppointment(id: string) {
    return this.firestore.collection('appointments').doc(id).delete();
  }
}
