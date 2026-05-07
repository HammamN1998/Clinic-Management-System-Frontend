import { Role } from './role';

export class User {
  id!: string;
  name!: string;
  phoneNumber: string = '';
  email!: string;
  address: string = '';
  about: string = '';
  education: string = '';
  experience: string = '';
  role!: Role;
  secretaryDoctorId: string = '';
  img: string = '';
  imgSize: number = 0;
  plan: string = '';
  status: string = '';
  maxPatientsLimit: number = 0;
  maxStorageLimitBytes: number = 0;
  patientsCount: number = 0;
  storageBytesUsed: number = 0;
}
