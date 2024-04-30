import * as firestore from 'firebase/firestore';

export class TreatmentModel {
  id: string = '';
  price: number = 0;
  discount: number = 0;
  date: firestore.Timestamp = new firestore.Timestamp(0, 0);
  details: string = '';
  doctorId: string = '';
  patientId: string = '';
  constructor() {}

}
