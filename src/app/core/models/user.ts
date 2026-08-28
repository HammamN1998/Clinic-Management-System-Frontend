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
  name: string = '';
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
  subscription: UserSubscription = {
    status: 'active',
    plan: 'free',
    storageBytesUsed: 0,
    patientsCount: 0,
    maxPatientsLimit: 20,
    maxStorageLimitBytes: 1024 * 1024 * 200, // 200MB
  } as UserSubscription;
  /** Doctor's last-used dental notation; reused as the default on every chart. */
  preferredDentalNotation?: DentalNotation;
  /** Firestore: "true" | "false". Omitted or non-"false" = reminders enabled. */
  religiousRemindersEnabled?: string;
  /** Firestore: "true" | "false". Omitted or non-"false" = attended appointments stay on the calendar. */
  calendarShowAttendedAppointments?: string;
  /** ISO 4217 code for every amount in the clinic. Omitted = guessed from the browser region. */
  currency?: string;
}
