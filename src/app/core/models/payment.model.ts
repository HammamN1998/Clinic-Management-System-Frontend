import * as firestore from 'firebase/firestore';

export class PaymentModel {
  id: string = '';
  amount: number = 0;
  date: firestore.Timestamp = new firestore.Timestamp(0, 0);
  details: string = '';
  doctorId: string = '';
  patientId: string = '';
  /** The doctor who collected the payment. Missing on older records, which count as the account owner's. */
  providerId?: string;
  constructor() {}

}
