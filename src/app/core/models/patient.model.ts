import * as firestore from "firebase/firestore";

export interface SpecialDiagrams {
  adultTeethDiagram: {[toothId: string]: string}[],
}
export interface Attachment {
  name: string,
  type: string,
  url: string,
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
  attachments: Attachment[] = [];
  specialDiagrams: SpecialDiagrams = {
    adultTeethDiagram: [],
  };
  createdAt: firestore.Timestamp = new firestore.Timestamp(0, 0);


  constructor() {}
}
