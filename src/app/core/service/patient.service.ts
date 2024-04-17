import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Patient } from '@core/models/patient.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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
    this.subs.sink = this.httpClient.get<Patient[]>(this.API_URL).subscribe({
      next: (data) => {
        this.isTblLoading = false;
        this.dataChange.next(data);
      },
      error: (error: HttpErrorResponse) => {
        this.isTblLoading = false;
        console.log(error.name + ' ' + error.message);
      },
    });
  }
  addPatient(patient: Patient): void {
    this.dialogData = patient;
    const firestorePatient = this.createFirestorePatient(patient);
    this.firestore.collection('patients').add(firestorePatient);
  }
  updatePatient(patient: Patient): void {
    this.dialogData = patient;

    // this.httpClient.put(this.API_URL + patient.id, patient)
    //     .subscribe({
    //       next: (data) => {
    //         this.dialogData = patient;
    //       },
    //       error: (error: HttpErrorResponse) => {
    //          // error code here
    //       },
    //     });
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
          imgUrl: patient.imgUrl,
          doctorId: patient.doctorId,
      }
  }
}
