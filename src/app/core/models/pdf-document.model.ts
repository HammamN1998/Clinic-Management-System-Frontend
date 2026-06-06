/** Clinic/doctor branding rendered in PDF headers and footers. */
export interface ClinicBranding {
  doctorName: string;
  phone?: string;
  address?: string;
  /** Doctor brand logo URL (doctor.logo). Resolved to a base64 data URL by PdfService. */
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
