/** One line of the clinic report: a doctor's figures for the range, or the total of the doctors. */
export interface ClinicReportLine {
  /** The doctor's name, or "Total". */
  label: string;
  appointments: number;
  treatments: number;
  collected: number;
  /** Null for a doctor without an agreement, such as the admin himself, and on the total line. */
  commissionPercent: number | null;
  /** Null for a doctor without an agreement. */
  commission: number | null;
}

/** What By doctor on the clinic dashboard shows, for its Excel and PDF exports. */
export interface ClinicReport {
  firstDay: Date;
  lastDay: Date;
  lines: ClinicReportLine[];
  /** Only when there is more than one doctor. */
  total: ClinicReportLine | null;
  /** What the clinic's patients owe in all, over all time. */
  outstanding: number;
  /** The clinic account's currency, which every amount is in. */
  currency: string;
  /** Without the extension. */
  fileName: string;
}
