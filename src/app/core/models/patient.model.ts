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
  address: string = 'Palestine - ';
  bloodGroup: string = '';
  bloodPressure: string = '';
  condition: string = '';
  img: string = 'assets/images/user/user1.jpg';
  doctorId: string = '';
  specialDiagrams: SpecialDiagrams = {
    adultTeethDiagram: [],
    childrenTeethDiagram: []
  };

  constructor() {}
}
