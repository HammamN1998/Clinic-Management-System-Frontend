import * as firestore from 'firebase/firestore';

export interface AppointmentDrug {
  name: string;
  type: string;
  duration: string;
  notes: string;
}

export class AppointmentModel {
  id: string = '';
  date: firestore.Timestamp = new firestore.Timestamp(0, 0);
  time: firestore.Timestamp = new firestore.Timestamp(0, 0);
  details: string = '';
  cost: number = 0;
  costPaid: boolean = true;
  attended: boolean = false;
  prescriptions: AppointmentDrug[] = [];
  subjective: string = '';
  objective: string = '';
  assessment: string = '';
  plan: string = '';
  doctorId: string = '';
  patientId: string = '';
  constructor() {}

}
