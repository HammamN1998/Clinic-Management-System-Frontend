import * as firestore from 'firebase/firestore';

export class PaymentModel {
  id: string = '';
  amount: number = 0;
  date: firestore.Timestamp = new firestore.Timestamp(0, 0);
  details: string = '';
  doctorId: string = '';
  patientId: string = '';
  constructor() {}

}
