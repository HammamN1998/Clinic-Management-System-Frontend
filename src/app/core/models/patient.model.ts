import * as firestore from "firebase/firestore";

export interface SpecialDiagrams {
  adultTeethDiagram: {[toothId: string]: string}[],
}
export interface Attachment {
  name: string,
  type: string,
  url: string,
  size: number,
}
export class Patient {
  id: string = '';
  firstName: string = '';
  lastName: string = '';
  gender: string = '';
  phoneNumber: string = '';
  birthDate: firestore.Timestamp = firestore.Timestamp.now();
  email: string = '';
  maritalState: string = '';
  address: string = '';
  bloodGroup: string = '';
  bloodPressure: string = '';
  condition: string = '';
  img: string = '';
  imgSize: number = 0;
  doctorId: string = '';
  attachments: Attachment[] = [];
  specialDiagrams: SpecialDiagrams = {
    adultTeethDiagram: [],
  };
  createdAt: firestore.Timestamp = firestore.Timestamp.now();
  notes: string = '';

  constructor() {}
}
