export class AmbulanceList {
  id: number;
  vehicle_no: string;
  vehicle_name: string;
  year_made: string;
  driver_name: string;
  driver_license_no: string;
  driver_no: string;
  vehicle_type: string;
  note: string;
  constructor(ambulanceList: AmbulanceList) {
    {
      this.id = ambulanceList.id || this.getRandomID();
      this.vehicle_no = ambulanceList.vehicle_no || '';
      this.vehicle_name = ambulanceList.vehicle_name || '';
      this.year_made = ambulanceList.year_made || '';
      this.driver_name = ambulanceList.driver_name || '';
      this.driver_license_no = ambulanceList.driver_license_no || '';
      this.driver_no = ambulanceList.driver_no || '';
      this.vehicle_type = ambulanceList.vehicle_type || '';
      this.note = ambulanceList.note || '';
    }
  }
  public getRandomID(): number {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000) | 0;
    };
    return S4() + S4();
  }
}
