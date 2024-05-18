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
  secretaryDoctorId!: string;
  img!: string;
}
