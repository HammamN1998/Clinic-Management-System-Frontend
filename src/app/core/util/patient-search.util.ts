import { Patient } from '@core/models/patient.model';

/** Same match used by the All Patients search: name, phone, email, address, and gender. */
export function matchesPatientSearch(patient: Patient, term: string): boolean {
  const normalizedTerm = term.toLowerCase();
  const haystack = [
    patient.firstName,
    patient.lastName,
    patient.phoneNumber,
    patient.email,
    patient.address,
    patient.gender,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(normalizedTerm);
}
