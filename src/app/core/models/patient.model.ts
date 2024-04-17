export class Patient {
  id: string;
  name: string;
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
      this.name = patient.name || '';
      this.gender = patient.gender || 'male';
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
