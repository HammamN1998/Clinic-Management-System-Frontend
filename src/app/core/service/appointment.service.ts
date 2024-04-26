import { Injectable } from '@angular/core';
import {BehaviorSubject, from} from "rxjs";
import {Patient} from "@core/models/patient.model";
import {AppointmentModel} from "@core/models/appointment.model";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {PatientService} from "@core/service/patient.service";
import {DateService} from "@core/service/date.service";

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {

  private appointments: BehaviorSubject<Patient[]> = new BehaviorSubject<Patient[]>([]);
  constructor(
    private firestore: AngularFirestore,
    private patientService: PatientService,
    private dateService: DateService,
  ) {}

  get data() {
    return this.appointments.value;
  }

  public addAppointment(appointment: AppointmentModel) {
    appointment.patientId = this.patientService.getDialogData().id;
    appointment.doctorId = this.patientService.getDialogData().doctorId;
    appointment.date = this.dateService.formatDateToISO8601(new Date(appointment.date));
    appointment.time = this.dateService.formatTimeToISO8601(new Date(appointment.time));

    from(this.firestore.collection('appointments').add( {...appointment} ))
      .subscribe({
        next: (result) => {
          this.firestore.collection('appointments').doc(result.id).update({id: result.id});
        },
        error: (error) => {
          console.log('error: ' + error)
        }
      }
    )

  }
}
