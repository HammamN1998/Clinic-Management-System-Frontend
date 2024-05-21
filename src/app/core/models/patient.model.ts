import * as firestore from "firebase/firestore";

export interface SpecialDiagrams {
  adultTeethDiagram: {[toothId: string]: string}[],
  childrenTeethDiagram: {[toothId: string]: string}[],
}
export class Patient {
  id: string = '';
  firstName: string = '';
  lastName: string = '';
  gender: string = '';
  phoneNumber: string = '';
  birthDate: firestore.Timestamp = new firestore.Timestamp(0, 0);
  email: string = '';
  maritalState: string = '';
  address: string = '';
  bloodGroup: string = '';
  bloodPressure: string = '';
  condition: string = '';
  img: string = '';
  doctorId: string = '';
  specialDiagrams: SpecialDiagrams = {
    adultTeethDiagram: [],
    childrenTeethDiagram: []
  };
  createdAt: firestore.Timestamp = new firestore.Timestamp(0, 0);


  constructor() {}
}
