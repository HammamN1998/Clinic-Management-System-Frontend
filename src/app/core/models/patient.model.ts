export class Patient {
  id: string = '';  // Initialize with empty string
  firstName: string = '';
  lastName: string = '';
  gender: string = '';
  phoneNumber: string = '';
  birthDate: string = '01/01/1910';
  email: string = '';
  maritalState: string = '';
  address: string = 'Palestine - ';  // Default address
  bloodGroup: string = '';
  bloodPressure: string = '';
  condition: string = '';
  img: string = 'assets/images/user/user1.jpg'; // Default image
  doctorId: string = '';

  constructor() {} // Empty constructor without parameters
}
