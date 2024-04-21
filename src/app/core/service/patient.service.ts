import { Injectable } from '@angular/core';
import {BehaviorSubject, from} from 'rxjs';
import { Patient } from '@core/models/patient.model';
import {HttpClient} from '@angular/common/http';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import {FirebaseAuthenticationService} from "../../authentication/services/firebase-authentication.service";
import {AngularFirestore} from "@angular/fire/compat/firestore";

@Injectable({
  providedIn: 'root',
})

export class PatientService extends UnsubscribeOnDestroyAdapter {
  private readonly API_URL = 'assets/data/patient.json';
  isTblLoading = true;
  dataChange: BehaviorSubject<Patient[]> = new BehaviorSubject<Patient[]>([]);
  // Temporarily stores data from dialogs
  dialogData!: Patient;
  constructor(
    private httpClient: HttpClient,
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
  addPatient(patient: Patient): void {
    this.dialogData = patient;

    const firestorePatient = this.createFirestorePatient(patient);
    from (this.firestore.collection('patients').add(firestorePatient))
      .subscribe( {
        next: (result) => {
          from (this.firestore.collection('patients').doc(result.id).ref.update({id: result.id}))
            .subscribe( {
                error: (error) => {
                  console.log('error: ' + JSON.stringify(error))
                }
            }
          );
          console.log('patient: ' + JSON.stringify(result.id));
        },
        error: (error) => {
          console.log('error: ' + JSON.stringify(error))
        }
      }
    );
  }
  updatePatient(patient: Patient): void {
    this.dialogData = patient;

    from (this.firestore.collection('patients').doc(patient.id).ref.update(patient))
      .subscribe( {
          error: (error) => {
            console.log('error: ' + JSON.stringify(error))
          }
        }
    );

  }
  deletePatient(id: number): void {
    console.log(id);

    // this.httpClient.delete(this.API_URL + id)
    //     .subscribe({
    //       next: (data) => {
    //         console.log(id);
    //       },
    //       error: (error: HttpErrorResponse) => {
    //          // error code here
    //       },
    //     });
  }

  createFirestorePatient(patient: Patient) : object {
      return {
          id: patient.id,
          name: patient.name,
          gender: patient.gender,
          phoneNumber: patient.phoneNumber,
          birthDate: patient.birthDate,
          email: patient.email,
          maritalState: patient.maritalState,
          address: patient.address,
          bloodGroup: patient.bloodGroup,
          bloodPressure: patient.bloodPressure,
          condition: patient.condition,
          img: patient.img,
          doctorId: this.firebaseAuthenticationService.currentUserValue.id,
      }
  }
}
