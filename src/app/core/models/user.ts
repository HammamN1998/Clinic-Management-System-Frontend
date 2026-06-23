import { DentalNotation } from './patient.model';

export interface UserSubscription {
  plan: string;
  status: string;
  storageBytesUsed: number;
  patientsCount: number;
  maxPatientsLimit: number;
  maxStorageLimitBytes: number;
}

export class User {
  id!: string;
  name!: string;
  phoneNumber: string = '';
  email: string = '';
  address: string = '';
  about: string = '';
  education: string = '';
  experience: string = '';
  img: string = '';
  imgSize: number = 0;
  logo: string = '';
  logoSize: number = 0;
  subscription: UserSubscription = {} as UserSubscription;
  /** Doctor's last-used dental notation; reused as the default on every chart. */
  preferredDentalNotation?: DentalNotation;
  /** Firestore: "true" | "false". Omitted or non-"false" = reminders enabled. */
  religiousRemindersEnabled?: string;
}
