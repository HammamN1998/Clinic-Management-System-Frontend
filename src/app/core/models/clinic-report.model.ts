/** One line of the clinic report: a doctor's figures for the range, or the total of the doctors shown. */
export interface ClinicReportLine {
  /** The doctor's name, or "Total". */
  label: string;
  appointments: number;
  treatments: number;
  newPatients: number;
  collected: number;
  /**
   * The money collected in the range since the doctor joined, which the commission is taken from.
   * Null, like the percent and the commission, for a doctor without an agreement in force, such as the admin himself.
   */
  commissionBase: number | null;
  /** Null on the total line too. */
  commissionPercent: number | null;
  commission: number | null;
  /** All time, not only the range. */
  outstanding: number;
  /** The doctor's own currency. The total is in the admin's. */
  currency: string;
}

/** What By doctor on the clinic dashboard shows, for its CSV and PDF exports. */
export interface ClinicReport {
  firstDay: Date;
  lastDay: Date;
  /** The name of the doctor shown, or "All doctors". */
  doctors: string;
  lines: ClinicReportLine[];
  /** Only when more than one doctor is shown. */
  total: ClinicReportLine | null;
  /** Without the extension. */
  fileName: string;
}
