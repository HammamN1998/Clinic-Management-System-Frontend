import * as firestore from 'firebase/firestore';

export class AppointmentModel {
  id: string = '';
  date: firestore.Timestamp = new firestore.Timestamp(0, 0);
  time: firestore.Timestamp = new firestore.Timestamp(0, 0);
  details: string = '';
  cost: number = 0;
  costPaid: boolean = true;
  attended: boolean = false;
  doctorId: string = '';
  patientId: string = '';
  constructor() {}

}
