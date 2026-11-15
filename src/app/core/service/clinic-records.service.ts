import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import * as firestore from 'firebase/firestore';
import { AppointmentModel } from '@core/models/appointment.model';
import { Patient } from '@core/models/patient.model';
import { amount } from '@core/util/balance-ledger.util';

/** One doctor's figures for a dashboard range. */
export interface DoctorRangeTotals {
  appointments: number;
  treatments: number;
  newPatients: number;
  /** Payments plus the appointment fees marked paid, as on the doctor's Earning card. */
  collected: number;
}

export interface ClinicAppointment {
  appointment: AppointmentModel;
  patient: Patient;
}

function inRange(field: string, start: Date, end: Date): firestore.QueryConstraint[] {
  return [
    firestore.where(field, '>=', firestore.Timestamp.fromDate(start)),
    firestore.where(field, '<', firestore.Timestamp.fromDate(end)),
  ];
}

/**
 * Reads the clinic doctors' records for the Clinic pages. The rules let a clinic admin read one
 * doctor's records per query, so every read names a single doctor. Totals are count and sum
 * queries, which Firestore answers from its indexes for one read per 1,000 records.
 */
@Injectable({ providedIn: 'root' })
export class ClinicRecordsService {
  constructor(private firestore: AngularFirestore) {}

  async rangeTotals(doctorId: string, start: Date, end: Date): Promise<DoctorRangeTotals> {
    const [appointments, treatments, newPatients, collected] = await Promise.all([
      this.count('appointments', doctorId, inRange('date', start, end)),
      this.count('treatments', doctorId, inRange('date', start, end)),
      this.count('patients', doctorId, inRange('createdAt', start, end)),
      this.collected(doctorId, start, end),
    ]);
    return { appointments, treatments, newPatients, collected };
  }

  /** Payments plus the appointment fees marked paid, as on the doctor's Earning card. */
  async collected(doctorId: string, start: Date, end: Date): Promise<number> {
    const [payments, paidFees] = await Promise.all([
      this.sum('payments', 'amount', doctorId, inRange('date', start, end)),
      this.sum('appointments', 'cost', doctorId, [firestore.where('costPaid', '==', true), ...inRange('date', start, end)]),
    ]);
    return payments + paidFees;
  }

  /**
   * What the doctor's patients owe in all, worked out like a patient's balance: treatments after
   * discount plus appointment fees, less payments and the fees marked paid. A patient who paid
   * ahead lowers it.
   */
  async outstanding(doctorId: string): Promise<number> {
    const [prices, discounts, fees, paidFees, payments] = await Promise.all([
      this.sum('treatments', 'price', doctorId),
      this.sum('treatments', 'discount', doctorId),
      this.sum('appointments', 'cost', doctorId),
      this.sum('appointments', 'cost', doctorId, [firestore.where('costPaid', '==', true)]),
      this.sum('payments', 'amount', doctorId),
    ]);
    return prices - discounts + fees - paidFees - payments;
  }

  /**
   * The doctors' appointments in the range, each with its patient. Patients are read once into
   * `patients`, which the caller can keep between ranges. An appointment whose patient can't be
   * read, because he was deleted for instance, is left out, as on the doctor's own calendar, and
   * so is one without a time, so one bad record can't break the view of every doctor.
   */
  async clinicAppointments(
    doctorIds: string[],
    start: Date,
    end: Date,
    patients: Map<string, Patient>,
  ): Promise<ClinicAppointment[]> {
    const appointments = (await Promise.all(doctorIds.map((doctorId) => this.appointments(doctorId, start, end)))).flat();
    await this.readPatients(appointments.map((appointment) => appointment.patientId), patients);
    const result: ClinicAppointment[] = [];
    for (const appointment of appointments) {
      const patient = patients.get(appointment.patientId);
      if (patient && typeof appointment.time?.toDate === 'function') {
        result.push({ appointment, patient });
      }
    }
    return result;
  }

  async patients(doctorId: string): Promise<Patient[]> {
    const snapshot = await this.firestore.collection('patients').ref.where('doctorId', '==', doctorId).get();
    return snapshot.docs.map((doc) => ({ ...(doc.data() as Patient), id: doc.id }));
  }

  private async appointments(doctorId: string, start: Date, end: Date): Promise<AppointmentModel[]> {
    const snapshot = await this.firestore.collection('appointments').ref
      .where('doctorId', '==', doctorId)
      .where('date', '>=', firestore.Timestamp.fromDate(start))
      .where('date', '<', firestore.Timestamp.fromDate(end))
      .orderBy('date', 'asc')
      .get();
    return snapshot.docs.map((doc) => ({ ...(doc.data() as AppointmentModel), id: doc.id }));
  }

  private async readPatients(patientIds: string[], patients: Map<string, Patient>): Promise<void> {
    const missing = [...new Set(patientIds)].filter((patientId) => patientId && !patients.has(patientId));
    const snapshots = await Promise.all(
      missing.map(async (patientId) => {
        // Inside the try, an id that isn't a valid document id fails only its own read.
        try {
          return await this.firestore.collection('patients').doc(patientId).ref.get();
        } catch (err) {
          console.error('Failed to read a patient', err);
          return null;
        }
      }),
    );
    for (const snapshot of snapshots) {
      if (snapshot?.exists) {
        patients.set(snapshot.id, { ...(snapshot.data() as Patient), id: snapshot.id });
      }
    }
  }

  private async count(collection: string, doctorId: string, filters: firestore.QueryConstraint[]): Promise<number> {
    const snapshot = await firestore.getCountFromServer(this.query(collection, doctorId, filters));
    return snapshot.data().count;
  }

  /** Each sum is its own query: one query summing several fields counts only records that have them all. */
  private async sum(collection: string, field: string, doctorId: string, filters: firestore.QueryConstraint[] = []): Promise<number> {
    const snapshot = await firestore.getAggregateFromServer(this.query(collection, doctorId, filters), {
      total: firestore.sum(field),
    });
    return amount(snapshot.data().total);
  }

  private query(collection: string, doctorId: string, filters: firestore.QueryConstraint[]) {
    return firestore.query(
      firestore.collection(firestore.getFirestore(), collection),
      firestore.where('doctorId', '==', doctorId),
      ...filters,
    );
  }
}
