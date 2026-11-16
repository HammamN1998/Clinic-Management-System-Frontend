/** Clinic/doctor branding rendered in PDF headers and footers. */
export interface ClinicBranding {
  /** Set for a doctor in a clinic: the header shows it above his name. */
  clinicName?: string;
  doctorName: string;
  phone?: string;
  address?: string;
  /** The clinic's logo for a doctor in a clinic, otherwise his own (doctor.logo). Resolved to a base64 data URL by PdfService. */
  logoUrl?: string;
}

/** Patient details used for the "Bill to" block. */
export interface PatientPdfContext {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address?: string;
  email?: string;
}

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';
