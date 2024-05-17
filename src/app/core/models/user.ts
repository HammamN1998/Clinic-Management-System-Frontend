import { Role } from './role';

export class User {
  id!: string;
  email!: string;
  name!: string;
  img!: string;
  role!: Role;
  secretaryDoctorId!: string;
}
