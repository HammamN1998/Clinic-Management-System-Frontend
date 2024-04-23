export class Patient {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  phoneNumber: string;
  birthDate: string;
  email: string;
  maritalState: string;
  address: string;
  bloodGroup: string;
  bloodPressure: string;
  condition: string;
  img: string;
  doctorId: string;

  constructor(patient: Patient) {
    {
      this.id = patient.id || '';
      this.firstName = patient.firstName || '';
      this.lastName = patient.lastName || '';
      this.gender = patient.gender || '';
      this.phoneNumber = patient.phoneNumber || '';
      this.birthDate = patient.birthDate || '';
      this.email = patient.email || '';
      this.maritalState = patient.maritalState || '';
      this.address = patient.address || 'Palestine - ';
      this.bloodGroup = patient.bloodGroup || '';
      this.bloodPressure = patient.bloodPressure || '';
      this.condition = patient.condition || '';
      this.img = patient.img || 'assets/images/user/user1.jpg';
      this.doctorId = patient.doctorId || '';
    }
  }

}
