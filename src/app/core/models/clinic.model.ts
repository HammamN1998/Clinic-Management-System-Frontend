/**
 * Clinic data as the app reads it. Cloud Functions write all of it; the client never does.
 * Firestore timestamps are converted to Dates on read, except inside a history entry's
 * `data` and `changed`, which hold record fields as stored.
 */

export const TERMS_NOTES_MAX_LENGTH = 1000;

export interface ClinicTerms {
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
  currentAgreementId: string | null;
  pendingAgreementId: string | null;
}

/** A doctor linked to the signed-in admin. */
export interface LinkedDoctor extends ClinicMembership {
  name: string;
  email: string;
  img: string;
}

/** One of `clinics/{adminId}.doctors`: the admin, or a doctor who works or worked in his clinic. */
export interface ClinicDoctor {
  doctorId: string;
  name: string;
  /** False once the doctor left the clinic. */
  active: boolean;
}

/** `clinics/{adminId}`: what linked doctors see of their clinic. */
export interface ClinicProfile {
  adminId: string;
  name: string;
  adminName: string;
  logo: string;
}

/** The functions' emails cut a longer clinic name. */
export const CLINIC_NAME_MAX_LENGTH = 80;

/** The clinic name and logo as the admin set them. Empty ones make the clinic profile use his own name and PDF logo. */
export interface ClinicBrand {
  name: string;
  logo: string;
  logoSize: number;
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

export type HistoryCollection = 'patients' | 'appointments' | 'treatments' | 'payments';

export type HistoryAction = 'create' | 'update' | 'delete';

export interface FieldChange {
  before: unknown;
  after: unknown;
}

/** `recordHistory/{id}`: one change to a patient, appointment, treatment, or payment in a clinic account. */
export interface HistoryEntry {
  id: string;
  /** The clinic account: its admin's id. */
  doctorId: string;
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
}

/** Pending and not yet past `expiresAt`: the only invites the functions let a doctor answer. */
export function isOpenInvite(invite: ClinicInvite, nowMs: number): boolean {
  return invite.status === 'pending' && !!invite.expiresAt && invite.expiresAt.getTime() > nowMs;
}

/** `expired` is stored only when the doctor tries to answer, so a pending invite past `expiresAt` is shown as expired. */
export function inviteDisplayStatus(invite: ClinicInvite, nowMs: number): InviteStatus {
  return invite.status === 'pending' && !isOpenInvite(invite, nowMs) ? 'expired' : invite.status;
}
