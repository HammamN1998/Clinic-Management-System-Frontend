/**
 * Clinic data as the app reads it. Cloud Functions write all of it; the client never does.
 * Firestore timestamps are converted to Dates on read, except inside a history entry's
 * `data` and `changed`, which hold record fields as stored.
 */

export type ClinicAccess = 'view' | 'edit';

/** The notice periods, in days, that the functions accept. */
export const NOTICE_DAYS = [0, 7, 14, 30] as const;

export const TERMS_NOTES_MAX_LENGTH = 1000;

export interface ClinicTerms {
  access: ClinicAccess;
  noticeDays: number;
  commissionPercent: number;
  notes: string;
}

/** The clinic fields on a doctor document. */
export interface ClinicMembership {
  doctorId: string;
  isAdmin: boolean;
  maxSeats: number;
  clinicAdminId: string | null;
  linkedAt: Date | null;
  clinicAccess: ClinicAccess | null;
  currentAgreementId: string | null;
  pendingAgreementId: string | null;
  unlinkEffectiveAt: Date | null;
  unlinkRequestedBy: 'doctor' | 'admin' | null;
}

/** A doctor linked to the signed-in admin. */
export interface LinkedDoctor extends ClinicMembership {
  name: string;
  email: string;
  img: string;
}

/** `clinics/{adminId}`: what linked doctors see of their clinic. */
export interface ClinicProfile {
  adminId: string;
  name: string;
  adminName: string;
  logo: string;
}

export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

export interface ClinicInvite {
  id: string;
  adminId: string;
  doctorId: string;
  email: string;
  adminName: string;
  clinicName: string;
  doctorName: string;
  status: InviteStatus;
  terms: ClinicTerms;
  sentAt: Date | null;
  sendCount: number;
  expiresAt: Date | null;
}

export type AgreementStatus = 'proposed' | 'active' | 'superseded' | 'declined' | 'ended';

export interface ClinicAgreement {
  id: string;
  adminId: string;
  doctorId: string;
  status: AgreementStatus;
  terms: ClinicTerms;
  proposedAt: Date | null;
  acceptedAt: Date | null;
}

/** `patientDeletionRequests/{patientId}`: a linked doctor asking his clinic to delete a patient. */
export interface PatientDeletionRequest {
  patientId: string;
  doctorId: string;
  adminId: string;
  patientName: string;
  status: 'pending' | 'rejected';
  requestedAt: Date | null;
  answeredAt: Date | null;
}

export type HistoryCollection = 'patients' | 'appointments' | 'treatments' | 'payments';

/** `delete-rejected` is the clinic rejecting a request to delete a patient. */
export type HistoryAction = 'create' | 'update' | 'delete' | 'delete-rejected';

export interface FieldChange {
  before: unknown;
  after: unknown;
}

/** `recordHistory/{id}`: one change to a linked doctor's patient, appointment, treatment, or payment. */
export interface HistoryEntry {
  id: string;
  doctorId: string;
  adminId: string;
  collection: HistoryCollection;
  recordId: string;
  patientId: string | null;
  patientName: string;
  action: HistoryAction;
  actorId: string | null;
  at: Date | null;
  /** The record as created, or as it was when deleted. */
  data: Record<string, unknown> | null;
  /** The fields an update changed. */
  changed: Record<string, FieldChange> | null;
  dentalChartChanged: boolean;
  /** Too large to keep, so only who, what, and when were stored. */
  tooLarge: boolean;
  /** For a patient's approved deletion: the admin who approved it. */
  approvedBy: string | null;
  requestedAt: Date | null;
}

/** Pending and not yet past `expiresAt`: the only invites the functions let a doctor answer. */
export function isOpenInvite(invite: ClinicInvite, nowMs: number): boolean {
  return invite.status === 'pending' && !!invite.expiresAt && invite.expiresAt.getTime() > nowMs;
}

/** `expired` is stored only when the doctor tries to answer, so a pending invite past `expiresAt` is shown as expired. */
export function inviteDisplayStatus(invite: ClinicInvite, nowMs: number): InviteStatus {
  return invite.status === 'pending' && !isOpenInvite(invite, nowMs) ? 'expired' : invite.status;
}
