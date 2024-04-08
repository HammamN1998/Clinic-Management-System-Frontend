import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import {FirebaseAuthenticationService} from "../../authentication/services/firebase-authentication.service";

@Injectable({
  providedIn: 'root'
})
export class PatientsService {

  constructor(
    private firestore: AngularFirestore,
    private firebaseAuthenticationService: FirebaseAuthenticationService,
  ) { }

  addPatient(
    firstName: string,
    lastName:string,
    gender:string,
    phoneNumber:string,
    birthDate:string,
    age: string,
    email: string,
    maritalState: string,
    address:string,
    bloodGroup: string,
    bloodPressure: string,
    sugar: string,
    condition:string
  ) {
    this.firestore.collection('patients').add({
      firstName: firstName,
      lastName: lastName,
      gender: gender,
      phoneNumber: phoneNumber,
      birthDate: birthDate,
      age: age,
      email: email,
      maritalState: maritalState,
      address: address,
      bloodGroup: bloodGroup,
      bloodPressure: bloodPressure,
      sugar: sugar,
      condition: condition,
      DoctorId: this.firebaseAuthenticationService.currentUserValue.id,
    });
  }

}
