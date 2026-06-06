import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import {
  Content,
  TDocumentDefinitions,
  TFontDictionary,
} from 'pdfmake/interfaces';
import { firstValueFrom } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AppointmentModel } from '@core/models/appointment.model';
import { PaymentModel } from '@core/models/payment.model';
import { TreatmentModel } from '@core/models/treatment.model';
import {
  ClinicBranding,
  PatientPdfContext,
  PaymentStatus,
} from '@core/models/pdf-document.model';
import { containsArabic, pdfLabel, pdfTextCell } from '@core/util/pdf-arabic.util';
import {
  BalanceLedgerLine,
  BalanceLedgerResult,
  buildBalanceLedger,
} from '@core/util/balance-ledger.util';
import {
  BaseDocumentOptions,
  Translator,
  buildBrandedDocument,
  formatDate,
  formatMoney,
  formatSignedMoney,
  fullPatientName,
} from '@core/util/pdf-document-template.util';
import { FirebaseAuthenticationService } from '../../authentication/services/firebase-authentication.service';

export interface PatientBalancePdfInput {
  treatments: TreatmentModel[];
  payments: PaymentModel[];
  appointments: AppointmentModel[];
  patient?: PatientPdfContext;
  /** Fallback when a full patient context is not available. */
  patientName?: string;
}

export interface PaymentReceiptPdfInput {
  payment: PaymentModel;
  patient: PatientPdfContext;
  remainingBalance: number;
}

export interface AppointmentPdfInput {
  appointment: AppointmentModel;
  patient: PatientPdfContext;
}

export interface PrescriptionPdfInput {
  appointment: AppointmentModel;
  patient: PatientPdfContext;
  note?: string;
}

export interface PatientLetterPdfInput {
  body: string;
  title?: string;
  patient: PatientPdfContext;
}

const ARABIC_FONT_FILE = 'NotoNaskhArabic-Regular.ttf';
const ARABIC_FONT_URL = `assets/fonts/noto-naskh-arabic/${ARABIC_FONT_FILE}`;

const ROBOTO_FONTS: TFontDictionary = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
};

type PdfMakeInstance = typeof pdfMake & {
  vfs: Record<string, string>;
  fonts?: TFontDictionary;
  addFonts?: (fonts: TFontDictionary) => void;
  createPdf: (
    doc: TDocumentDefinitions,
  ) => { download: (fileName?: string) => void };
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

@Injectable({
  providedIn: 'root',
})
export class PdfService {
  private pdfMakeReady: Promise<void> | null = null;
  /** Roboto + Arabic; passed into createPdf so bold/italic Roboto variants always resolve. */
  private pdfFontDictionary: TFontDictionary | null = null;
  private pdfVfs: Record<string, string> | null = null;
  private readonly logoCache = new Map<string, string>();

  constructor(
    private readonly http: HttpClient,
    private readonly translate: TranslateService,
    private readonly auth: FirebaseAuthenticationService,
  ) {}

  async downloadPdf(
    definition: TDocumentDefinitions,
    fileName: string,
  ): Promise<void> {
    await this.ensurePdfMakeReady();
    const name = fileName.toLowerCase().endsWith('.pdf')
      ? fileName
      : `${fileName}.pdf`;
    const maker = pdfMake as PdfMakeInstance;
    const fonts = this.pdfFontDictionary ?? ROBOTO_FONTS;
    const vfs = this.pdfVfs ?? (pdfFonts as unknown as Record<string, string>);
    maker.createPdf(definition, undefined, fonts, vfs).download(name);
  }

  // --- Public document generators -----------------------------------------

  async downloadPatientBalancePdf(input: PatientBalancePdfInput): Promise<void> {
    const ledger = buildBalanceLedger(
      input.treatments,
      input.payments,
      input.appointments,
    );
    const ctx = await this.documentContext(input.patient);
    const t = this.translator();
    const patientName = this.resolvePatientName(input.patient, input.patientName);
    const status = this.computeStatus(ledger.totalCharges, ledger.totalBalance);
    const body = this.buildDetailedBalanceBody(ledger, t);

    const doc = buildBrandedDocument(
      {
        ...ctx,
        title: t('PATIENTS.DOCUMENTS.DETAILED_INVOICE_TITLE'),
        patient: input.patient,
        status,
        qrPayload: this.balanceQrPayload(
          ctx.branding,
          input.patient,
          patientName,
          ledger,
          status,
          ctx.generatedAt,
        ),
        body,
      },
      t,
    );
    await this.downloadPdf(doc, this.fileName('balance-detailed', patientName));
  }

  async downloadPatientSimpleBalancePdf(
    input: PatientBalancePdfInput,
  ): Promise<void> {
    const ledger = buildBalanceLedger(
      input.treatments,
      input.payments,
      input.appointments,
    );
    const ctx = await this.documentContext(input.patient);
    const t = this.translator();
    const patientName = this.resolvePatientName(input.patient, input.patientName);
    const status = this.computeStatus(ledger.totalCharges, ledger.totalBalance);
    const body = this.buildSimpleBalanceBody(
      input.treatments,
      input.appointments,
      input.payments,
      ledger,
      t,
    );

    const doc = buildBrandedDocument(
      {
        ...ctx,
        title: t('PATIENTS.DOCUMENTS.SIMPLE_INVOICE_TITLE'),
        patient: input.patient,
        status,
        qrPayload: this.balanceQrPayload(
          ctx.branding,
          input.patient,
          patientName,
          ledger,
          status,
          ctx.generatedAt,
        ),
        body,
      },
      t,
    );
    await this.downloadPdf(doc, this.fileName('balance-simple', patientName));
  }

  async downloadPaymentReceiptPdf(input: PaymentReceiptPdfInput): Promise<void> {
    const ctx = await this.documentContext(input.patient);
    const t = this.translator();
    const patientName = fullPatientName(input.patient);
    const date = input.payment.date.toDate();
    const body: Content[] = [
      pdfLabel(t('PATIENTS.DOCUMENTS.RECEIVED_WITH_THANKS'), { style: 'sectionTitle' }),
      {
        margin: [0, 4, 0, 0],
        table: this.rtlTableDef({
          widths: ['*', '*'],
          body: [
            [
              pdfLabel(t('PATIENTS.BALANCE.PAYMENT'), { style: 'tableHeader' }),
              { text: formatMoney(input.payment.amount), alignment: 'right' },
            ],
            [
              pdfLabel(t('PATIENTS.BALANCE.DATE'), { style: 'tableHeader' }),
              { text: formatDate(date), alignment: 'right' },
            ],
            [
              pdfLabel(t('PATIENTS.BALANCE.DETAILS'), { style: 'tableHeader' }),
              pdfTextCell(input.payment.details ?? '', undefined),
            ],
            [
              pdfLabel(t('PATIENTS.DOCUMENTS.REMAINING_BALANCE'), { style: 'tableHeader' }),
              { text: formatMoney(input.remainingBalance), alignment: 'right' },
            ],
          ],
        }),
        layout: this.tableLayout(),
      },
    ];

    const doc = buildBrandedDocument(
      {
        ...ctx,
        title: t('PATIENTS.DOCUMENTS.RECEIPT_TITLE'),
        patient: input.patient,
        qrPayload: this.receiptQrPayload(
          ctx.branding,
          input.patient,
          patientName,
          input.payment.amount,
          input.remainingBalance,
          input.payment.details,
          date,
        ),
        body,
      },
      t,
    );
    await this.downloadPdf(doc, this.fileName('receipt', patientName));
  }

  async downloadAppointmentPdf(input: AppointmentPdfInput): Promise<void> {
    const ctx = await this.documentContext(input.patient);
    const t = this.translator();
    const patientName = fullPatientName(input.patient);
    const a = input.appointment;

    const infoRows: Content[][] = [
      [
        pdfLabel(t('PATIENTS.BALANCE.DATE'), { style: 'tableHeader' }),
        { text: formatDate(a.date.toDate()), alignment: 'right' },
      ],
      [
        pdfLabel(t('PATIENTS.DOCUMENTS.TIME'), { style: 'tableHeader' }),
        {
          text: a.time
            .toDate()
            .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          alignment: 'right',
        },
      ],
      [
        pdfLabel(t('PATIENTS.DOCUMENTS.COST'), { style: 'tableHeader' }),
        { text: formatMoney(a.cost), alignment: 'right' },
      ],
      [
        pdfLabel(t('SHARED.INVOICE.STATUS'), { style: 'tableHeader' }),
        pdfLabel(
          a.costPaid
            ? t('PATIENTS.DOCUMENTS.STATUS_PAID')
            : t('PATIENTS.DOCUMENTS.STATUS_UNPAID'),
          { alignment: 'right' },
        ),
      ],
    ];

    const body: Content[] = [
      {
        margin: [0, 4, 0, 8],
        table: this.rtlTableDef({ widths: ['*', '*'], body: infoRows }),
        layout: this.tableLayout(),
      },
    ];

    if (a.details?.trim()) {
      body.push(pdfLabel(t('PATIENTS.BALANCE.DETAILS'), { style: 'sectionTitle' }));
      body.push(pdfTextCell(a.details));
    }

    this.pushSoapSection(body, 'PATIENTS.DOCUMENTS.SUBJECTIVE', a.subjective, t);
    this.pushSoapSection(body, 'PATIENTS.DOCUMENTS.OBJECTIVE', a.objective, t);
    this.pushSoapSection(body, 'PATIENTS.DOCUMENTS.ASSESSMENT', a.assessment, t);
    this.pushSoapSection(body, 'PATIENTS.DOCUMENTS.PLAN', a.plan, t);

    if (a.prescriptions?.length) {
      body.push(
        pdfLabel(t('PATIENTS.DOCUMENTS.PRESCRIPTIONS'), {
          style: 'sectionTitle',
        }),
      );
      body.push(this.buildPrescriptionTable(a.prescriptions, t));
    }

    const doc = buildBrandedDocument(
      {
        ...ctx,
        title: t('PATIENTS.DOCUMENTS.APPOINTMENT_TITLE'),
        patient: input.patient,
        body,
      },
      t,
    );
    await this.downloadPdf(doc, this.fileName('appointment', patientName));
  }

  async downloadPrescriptionPdf(input: PrescriptionPdfInput): Promise<void> {
    const ctx = await this.documentContext(input.patient);
    const t = this.translator();
    const patientName = fullPatientName(input.patient);
    const a = input.appointment;

    const body: Content[] = [
      {
        columns: [
          pdfLabel(t('PATIENTS.DOCUMENTS.RX_TITLE'), {
            style: 'rxTitle',
            width: 'auto',
          }),
          {
            text: formatDate(a.date.toDate()),
            style: 'subtle',
            width: 'auto',
            margin: [8, 6, 0, 0],
          },
        ],
        columnGap: 6,
      },
      this.buildPrescriptionTable(a.prescriptions ?? [], t),
    ];

    if (input.note?.trim()) {
      body.push(
        pdfLabel(t('PATIENTS.DOCUMENTS.DOCTOR_NOTE'), { style: 'sectionTitle' }),
      );
      body.push(pdfTextCell(input.note.trim(), 'letterBody'));
    }

    const doc = buildBrandedDocument(
      {
        ...ctx,
        title: t('PATIENTS.DOCUMENTS.PRESCRIPTION_TITLE'),
        patient: input.patient,
        body,
      },
      t,
    );
    await this.downloadPdf(doc, this.fileName('prescription', patientName));
  }

  async downloadPatientLetterPdf(input: PatientLetterPdfInput): Promise<void> {
    const ctx = await this.documentContext(input.patient);
    const t = this.translator();
    const patientName = fullPatientName(input.patient);

    const body: Content[] = [];
    const letterTitle = input.title?.trim();
    if (letterTitle) {
      body.push(pdfTextCell(letterTitle, 'letterTitle'));
    }
    body.push(pdfTextCell(input.body ?? '', 'letterBody'));

    const doc = buildBrandedDocument(
      {
        ...ctx,
        title: t('PATIENTS.DOCUMENTS.LETTER_TITLE'),
        patient: input.patient,
        body,
      },
      t,
    );
    await this.downloadPdf(doc, this.fileName('letter', patientName));
  }

  // --- Body builders -------------------------------------------------------

  private buildDetailedBalanceBody(
    ledger: BalanceLedgerResult,
    t: Translator,
  ): Content[] {
    const headerRow: Content[] = [
      { text: '#', style: 'tableHeader' },
      pdfLabel(t('PATIENTS.LIST.TREATMENT'), { style: 'tableHeader' }),
      pdfLabel(t('PATIENTS.BALANCE.DISCOUNT'), { style: 'tableHeader' }),
      pdfLabel(t('PATIENTS.BALANCE.PAYMENT'), { style: 'tableHeader' }),
      pdfLabel(t('PATIENTS.BALANCE.DETAILS'), { style: 'tableHeader' }),
      pdfLabel(t('PATIENTS.BALANCE.DATE'), { style: 'tableHeader' }),
      pdfLabel(t('PATIENTS.BALANCE.TOTAL'), { style: 'tableHeader' }),
    ];

    const body: Content[][] = [
      headerRow,
      ...ledger.combinedList.map((line, i) => this.ledgerLineToRow(line, i)),
      this.balanceDueRow(ledger.totalBalance, t),
    ];

    return [
      {
        table: this.rtlTableDef({
          headerRows: 1,
          widths: [26, 62, 52, 52, '*', 72, 62],
          body,
        }),
        layout: this.tableLayout(),
      },
    ];
  }

  private buildSimpleBalanceBody(
    treatments: TreatmentModel[],
    appointments: AppointmentModel[],
    payments: PaymentModel[],
    ledger: BalanceLedgerResult,
    t: Translator,
  ): Content[] {
    const chargeRows: Content[][] = [
      [
        { text: '#', style: 'tableHeader' },
        pdfLabel(t('PATIENTS.LIST.TREATMENT'), { style: 'tableHeader' }),
        pdfLabel(t('PATIENTS.BALANCE.DETAILS'), { style: 'tableHeader' }),
        pdfLabel(t('PATIENTS.BALANCE.DATE'), { style: 'tableHeader' }),
        pdfLabel(t('PATIENTS.BALANCE.TOTAL'), { style: 'tableHeader' }),
      ],
    ];
    let index = 0;
    treatments.forEach((tr) => {
      index++;
      const net = tr.price - tr.discount;
      chargeRows.push([
        String(index),
        tr.discount
          ? `${formatMoney(tr.price)} (-${formatMoney(tr.discount)})`
          : formatMoney(tr.price),
        pdfTextCell(tr.details ?? '', undefined),
        formatDate(tr.date.toDate()),
        { text: formatMoney(net), alignment: 'right' },
      ]);
    });
    appointments
      .filter((a) => !a.costPaid)
      .forEach((a) => {
        index++;
        chargeRows.push([
          String(index),
          pdfTextCell(t('PATIENTS.DOCUMENTS.APPOINTMENT_TITLE'), undefined),
          pdfTextCell(a.details ?? '', undefined),
          formatDate(a.date.toDate()),
          { text: formatMoney(a.cost), alignment: 'right' },
        ]);
      });
    chargeRows.push([
      this.emptyCell(),
      this.emptyCell(),
      this.emptyCell(),
      pdfLabel(t('PATIENTS.DOCUMENTS.SUBTOTAL_CHARGES'), { style: 'totalLabel', alignment: 'right' }),
      { text: formatMoney(ledger.totalCharges), style: 'totalValue', alignment: 'right' },
    ]);

    const paymentRows: Content[][] = [
      [
        { text: '#', style: 'tableHeader' },
        pdfLabel(t('PATIENTS.BALANCE.DETAILS'), { style: 'tableHeader' }),
        pdfLabel(t('PATIENTS.BALANCE.DATE'), { style: 'tableHeader' }),
        pdfLabel(t('PATIENTS.BALANCE.PAYMENT'), { style: 'tableHeader' }),
      ],
    ];
    payments.forEach((p, i) => {
      paymentRows.push([
        String(i + 1),
        pdfTextCell(p.details ?? '', undefined),
        formatDate(p.date.toDate()),
        { text: formatMoney(p.amount), alignment: 'right' },
      ]);
    });
    paymentRows.push([
      this.emptyCell(),
      this.emptyCell(),
      pdfLabel(t('PATIENTS.DOCUMENTS.SUBTOTAL_PAYMENTS'), { style: 'totalLabel', alignment: 'right' }),
      { text: formatMoney(ledger.totalPayments), style: 'totalValue', alignment: 'right' },
    ]);

    return [
      pdfLabel(t('PATIENTS.DOCUMENTS.CHARGES'), { style: 'sectionTitle' }),
      {
        table: this.rtlTableDef({ headerRows: 1, widths: [26, '*', '*', 72, 62], body: chargeRows }),
        layout: this.tableLayout(),
      },
      pdfLabel(t('PATIENTS.DOCUMENTS.PAYMENTS_SECTION'), { style: 'sectionTitle' }),
      {
        table: this.rtlTableDef({ headerRows: 1, widths: [26, '*', 72, 62], body: paymentRows }),
        layout: this.tableLayout(),
      },
      this.balanceDueLine(ledger.totalBalance, t),
    ];
  }

  /** Bottom "Balance Due" line; clustered to the right (LTR) or left (RTL). */
  private balanceDueLine(totalBalance: number, t: Translator): Content {
    const rtl = this.isRtl();
    const align = rtl ? 'left' : 'right';
    const label = pdfLabel(t('PATIENTS.DOCUMENTS.BALANCE_DUE'), {
      style: 'totalLabel',
      alignment: align,
    });
    const value: Content = {
      width: 90,
      text: formatMoney(totalBalance),
      style: 'totalValue',
      alignment: align,
    } as Content;
    return {
      margin: [0, 14, 0, 0],
      columns: rtl ? [value, label] : [label, value],
    };
  }

  private buildPrescriptionTable(
    prescriptions: { name: string; type: string; duration: string; notes: string }[],
    t: Translator,
  ): Content {
    const header: Content[] = [
      { text: '#', style: 'tableHeader' },
      pdfLabel(t('PATIENTS.DOCUMENTS.DRUG_NAME'), { style: 'tableHeader' }),
      pdfLabel(t('PATIENTS.DOCUMENTS.DRUG_TYPE'), { style: 'tableHeader' }),
      pdfLabel(t('PATIENTS.DOCUMENTS.DRUG_DURATION'), { style: 'tableHeader' }),
      pdfLabel(t('PATIENTS.DOCUMENTS.DRUG_NOTES'), { style: 'tableHeader' }),
    ];
    const rows: Content[][] = [
      header,
      ...prescriptions.map((d, i) => [
        String(i + 1),
        pdfTextCell(d.name ?? '', undefined),
        pdfTextCell(d.type ?? '', undefined),
        pdfTextCell(d.duration ?? '', undefined),
        pdfTextCell(d.notes ?? '', undefined),
      ]),
    ];
    return {
      table: this.rtlTableDef({ headerRows: 1, widths: [20, '*', 70, 70, '*'], body: rows }),
      layout: this.tableLayout(),
    };
  }

  private ledgerLineToRow(line: BalanceLedgerLine, index: number): Content[] {
    const dateStr = formatDate(line.date.toDate());
    const details = (line as { details?: string }).details ?? '';
    const n = index + 1;

    if ('price' in line) {
      const tr = line as TreatmentModel;
      const net = tr.price - tr.discount;
      return [
        String(n),
        formatSignedMoney(tr.price),
        tr.discount ? `-${formatMoney(tr.discount)}` : '-',
        '-',
        pdfTextCell(details, undefined),
        dateStr,
        formatSignedMoney(net),
      ];
    }

    if ('costPaid' in line) {
      const a = line as AppointmentModel;
      return [
        String(n),
        formatSignedMoney(a.cost),
        '-',
        '-',
        pdfTextCell(details, undefined),
        dateStr,
        formatSignedMoney(a.cost),
      ];
    }

    const p = line as PaymentModel;
    return [
      String(n),
      '-',
      '-',
      `-${formatMoney(p.amount)}`,
      pdfTextCell(details, undefined),
      dateStr,
      `-${formatMoney(p.amount)}`,
    ];
  }

  private balanceDueRow(totalBalance: number, t: Translator): Content[] {
    return [
      this.emptyCell(),
      this.emptyCell(),
      this.emptyCell(),
      this.emptyCell(),
      this.emptyCell(),
      pdfLabel(t('PATIENTS.DOCUMENTS.BALANCE_DUE'), { style: 'totalLabel', alignment: 'right' }),
      {
        text: formatSignedMoney(totalBalance),
        style: 'totalValue',
        alignment: 'right',
      },
    ];
  }

  private pushSoapSection(
    body: Content[],
    labelKey: string,
    value: string,
    t: Translator,
  ): void {
    if (!value?.trim()) {
      return;
    }
    body.push(pdfLabel(t(labelKey), { style: 'sectionTitle' }));
    body.push(pdfTextCell(value, undefined));
  }

  // --- Helpers -------------------------------------------------------------

  private translator(): Translator {
    return (key: string, params?: Record<string, unknown>) =>
      this.translate.instant(key, params);
  }

  private getBranding(): ClinicBranding {
    const doctor = this.auth.currentUserValue;
    return {
      doctorName: this.withDoctorPrefix(doctor?.name ?? ''),
      phone: doctor?.phoneNumber || undefined,
      address: doctor?.address || undefined,
      logoUrl: doctor?.logo || undefined,
    };
  }

  /**
   * Prepend the doctor title matching the NAME's own script ("د." for an
   * Arabic name, "Dr." otherwise) rather than the active UI language, unless
   * the name already starts with a recognized title to avoid doubling it.
   */
  private withDoctorPrefix(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) {
      return '';
    }
    const lower = trimmed.toLowerCase();
    const alreadyPrefixed =
      lower.startsWith('dr.') ||
      lower.startsWith('dr ') ||
      lower.startsWith('د.') ||
      lower.startsWith('د ');
    if (alreadyPrefixed) {
      return trimmed;
    }
    const prefix = containsArabic(trimmed) ? 'د.' : 'Dr.';
    return `${prefix} ${trimmed}`;
  }

  /** Resolve branding + logo data URL + generation timestamp for a document. */
  private async documentContext(
    patient?: PatientPdfContext,
  ): Promise<Omit<BaseDocumentOptions, 'title' | 'body'>> {
    await this.ensurePdfMakeReady();
    const branding = this.getBranding();
    const logoDataUrl = await this.loadLogoAsDataUrl(branding.logoUrl);
    return {
      branding,
      logoDataUrl,
      patient,
      generatedAt: new Date(),
    };
  }

  private async loadLogoAsDataUrl(
    logoUrl?: string,
  ): Promise<string | undefined> {
    // No uploaded logo -> render no logo at all (no default fallback).
    if (!logoUrl || !logoUrl.trim()) {
      return undefined;
    }
    const cached = this.logoCache.get(logoUrl);
    if (cached) {
      return cached;
    }
    try {
      const response = await firstValueFrom(
        this.http.get(logoUrl, {
          responseType: 'arraybuffer',
          observe: 'response',
        }),
      );
      const contentType =
        response.headers.get('Content-Type') ?? 'image/png';
      const base64 = arrayBufferToBase64(response.body as ArrayBuffer);
      const dataUrl = `data:${contentType};base64,${base64}`;
      this.logoCache.set(logoUrl, dataUrl);
      return dataUrl;
    } catch {
      return undefined;
    }
  }

  private computeStatus(
    totalCharges: number,
    totalBalance: number,
  ): PaymentStatus {
    if (totalBalance <= 0) {
      return 'paid';
    }
    if (totalBalance < totalCharges) {
      return 'partial';
    }
    return 'unpaid';
  }

  /**
   * Build a compact, scannable QR payload from labeled key/value pairs.
   * Empty values are skipped so the QR only encodes data actually present
   * on the invoice. A short header marks it as a ClinicWell document.
   */
  private buildQrPayload(
    pairs: Array<[string, string | number | undefined | null]>,
  ): string {
    const lines = pairs
      .filter(([, value]) => {
        if (value === undefined || value === null) {
          return false;
        }
        return `${value}`.trim() !== '';
      })
      .map(([label, value]) => `${label}: ${`${value}`.trim()}`);
    return ['ClinicWell Invoice', ...lines].join('\n');
  }

  /** Stable English status label embedded in the QR (language-neutral). */
  private statusLabelEn(status: PaymentStatus): string {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'partial':
        return 'Partially Paid';
      default:
        return 'Unpaid';
    }
  }

  /** Rich payload for detailed/simple balance invoices. */
  private balanceQrPayload(
    branding: ClinicBranding,
    patient: PatientPdfContext | undefined,
    patientName: string,
    ledger: BalanceLedgerResult,
    status: PaymentStatus,
    generatedAt: Date,
  ): string {
    return this.buildQrPayload([
      ['Clinic', branding.doctorName],
      ['Clinic Phone', branding.phone],
      ['Patient', patientName],
      ['Phone', patient?.phoneNumber],
      ['Address', patient?.address],
      ['Date', formatDate(generatedAt)],
      ['Charges', formatMoney(ledger.totalCharges)],
      ['Payments', formatMoney(ledger.totalPayments)],
      ['Balance Due', formatMoney(ledger.totalBalance)],
      ['Status', this.statusLabelEn(status)],
    ]);
  }

  /** Rich payload for a single payment receipt. */
  private receiptQrPayload(
    branding: ClinicBranding,
    patient: PatientPdfContext,
    patientName: string,
    amount: number,
    remainingBalance: number,
    details: string | undefined,
    date: Date,
  ): string {
    return this.buildQrPayload([
      ['Clinic', branding.doctorName],
      ['Clinic Phone', branding.phone],
      ['Patient', patientName],
      ['Phone', patient.phoneNumber],
      ['Date', formatDate(date)],
      ['Amount Paid', formatMoney(amount)],
      ['Remaining Balance', formatMoney(remainingBalance)],
      ['Details', details],
    ]);
  }

  private resolvePatientName(
    patient?: PatientPdfContext,
    fallback?: string,
  ): string {
    if (patient) {
      return fullPatientName(patient);
    }
    return fallback?.trim() ?? '';
  }

  private emptyCell(): Content {
    return { text: '', border: [false, false, false, false] } as Content;
  }

  private tableLayout() {
    return {
      fillColor: (rowIndex: number) => (rowIndex === 0 ? '#eeeeee' : null),
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#cccccc',
      vLineColor: () => '#cccccc',
    };
  }

  /** True when the active document language is Arabic (RTL). */
  private isRtl(): boolean {
    return containsArabic(this.translator()('SHARED.INVOICE.BILL_FROM'));
  }

  /**
   * For RTL documents, reverse a table's column order so the first column lands
   * on the far right and the rest follow leftwards. Widths and every row's cells
   * are reversed together; in LTR the definition is returned unchanged.
   */
  private rtlTableDef<
    T extends { headerRows?: number; widths: (number | string)[]; body: Content[][] },
  >(def: T): T {
    if (!this.isRtl()) {
      return def;
    }
    return {
      ...def,
      widths: [...def.widths].reverse(),
      body: def.body.map((row) => [...row].reverse()),
    };
  }

  private fileName(prefix: string, patientName: string): string {
    const suffix = patientName ? `-${this.safeFileSegment(patientName)}` : '';
    const stamp = new Date().toISOString().slice(0, 10);
    return `${prefix}${suffix}-${stamp}`;
  }

  private safeFileSegment(name: string): string {
    const s = name.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').trim();
    return s.slice(0, 48) || 'patient';
  }

  private ensurePdfMakeReady(): Promise<void> {
    if (!this.pdfMakeReady) {
      this.pdfMakeReady = this.initializePdfMake();
    }
    return this.pdfMakeReady;
  }

  private async initializePdfMake(): Promise<void> {
    const maker = pdfMake as PdfMakeInstance;
    const baseVfs: Record<string, string> = {
      ...(pdfFonts as unknown as Record<string, string>),
    };

    const fontBuffer = await firstValueFrom(
      this.http.get(ARABIC_FONT_URL, { responseType: 'arraybuffer' }),
    );
    baseVfs[ARABIC_FONT_FILE] = arrayBufferToBase64(fontBuffer);

    this.pdfVfs = baseVfs;
    maker.vfs = baseVfs;

    const arabicFaces = {
      normal: ARABIC_FONT_FILE,
      bold: ARABIC_FONT_FILE,
      italics: ARABIC_FONT_FILE,
      bolditalics: ARABIC_FONT_FILE,
    };
    const mergedFonts: TFontDictionary = {
      ...ROBOTO_FONTS,
      Arabic: arabicFaces,
    };
    this.pdfFontDictionary = mergedFonts;
    maker.fonts = mergedFonts;
    if (typeof maker.addFonts === 'function') {
      maker.addFonts(mergedFonts);
    }
  }
}
