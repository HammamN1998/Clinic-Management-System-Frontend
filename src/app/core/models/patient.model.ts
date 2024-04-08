export class Patient {
  id: number;
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
  imgUrl: string;
  doctorId: string;

  constructor(patient: Patient) {
    {
      this.id = patient.id || 0;
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
      this.imgUrl = patient.imgUrl || 'assets/images/user/user1.jpg';
      this.doctorId = patient.doctorId || '';
    }
  }

}
