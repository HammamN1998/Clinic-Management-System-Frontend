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
import { AppointmentModel } from '@core/models/appointment.model';
import { PaymentModel } from '@core/models/payment.model';
import { TreatmentModel } from '@core/models/treatment.model';
import { pdfTextCell } from '@core/util/pdf-arabic.util';
import {
  BalanceLedgerLine,
  buildBalanceLedger,
} from '@core/util/balance-ledger.util';

export interface PatientBalancePdfInput {
  treatments: TreatmentModel[];
  payments: PaymentModel[];
  appointments: AppointmentModel[];
  patientName?: string;
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

  constructor(private readonly http: HttpClient) {}

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

  async downloadPatientBalancePdf(
    input: PatientBalancePdfInput,
  ): Promise<void> {
    const { combinedList, totalBalance } = buildBalanceLedger(
      input.treatments,
      input.payments,
      input.appointments,
    );
    const doc = this.buildPatientBalanceDocument(
      combinedList,
      totalBalance,
      input.patientName,
    );
    const stamp = new Date().toISOString().slice(0, 10);
    const suffix = input.patientName
      ? `-${this.safeFileSegment(input.patientName)}`
      : '';
    await this.downloadPdf(doc, `balance-summary${suffix}-${stamp}`);
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

  private safeFileSegment(name: string): string {
    const s = name.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').trim();
    return s.slice(0, 48) || 'patient';
  }

  private buildPatientBalanceDocument(
    lines: BalanceLedgerLine[],
    totalBalance: number,
    patientName?: string,
  ): TDocumentDefinitions {
    const generated = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const headerStack: Content[] = [
      { text: 'Patient balance summary', style: 'title' },
      { text: `Generated: ${generated}`, style: 'subtle' },
    ];
    if (patientName?.trim()) {
      headerStack.push(pdfTextCell(patientName.trim(), 'h2'));
    }

    const headerRow = [
      { text: '#', style: 'tableHeader' },
      { text: 'Treatment / charge', style: 'tableHeader' },
      { text: 'Discount', style: 'tableHeader' },
      { text: 'Payment', style: 'tableHeader' },
      { text: 'Details', style: 'tableHeader' },
      { text: 'Date', style: 'tableHeader' },
      { text: 'Line total', style: 'tableHeader' },
    ];

    const body: Content[][] = [
      headerRow,
      ...lines.map((line, i) => this.ledgerLineToRow(line, i)),
      this.totalRow(totalBalance),
    ];

    return {
      pageSize: 'A4',
      pageMargins: [40, 48, 40, 48],
      content: [
        { stack: headerStack, margin: [0, 0, 0, 16] },
        {
          table: {
            headerRows: 1,
            widths: [26, 62, 52, 52, '*', 72, 62],
            body,
          },
          layout: {
            fillColor: (rowIndex: number) =>
              rowIndex === 0 ? '#eeeeee' : null,
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#cccccc',
            vLineColor: () => '#cccccc',
          },
        },
      ],
      defaultStyle: {
        font: 'Roboto',
        fontSize: 9,
      },
      styles: {
        title: { fontSize: 16, bold: true },
        h2: { fontSize: 11, bold: true, margin: [0, 6, 0, 0] },
        subtle: { fontSize: 9, color: '#555555' },
        tableHeader: { bold: true, fontSize: 9 },
        totalLabel: { bold: true },
        totalValue: { bold: true },
      },
    };
  }

  private ledgerLineToRow(line: BalanceLedgerLine, index: number): Content[] {
    const dateStr = line.date.toDate().toLocaleDateString('en-US');
    const details = line.details ?? '';
    const n = index + 1;

    if ('price' in line) {
      const t = line as TreatmentModel;
      const net = t.price - t.discount;
      return [
        String(n),
        `+${t.price} NIS`,
        t.discount ? `-${t.discount} NIS` : '-',
        '-',
        pdfTextCell(details),
        dateStr,
        `+${net} NIS`,
      ];
    }

    if ('costPaid' in line) {
      const a = line as AppointmentModel;
      return [
        String(n),
        `+${a.cost} NIS`,
        '-',
        '-',
        pdfTextCell(details),
        dateStr,
        `+${a.cost} NIS`,
      ];
    }

    const p = line as PaymentModel;
    return [
      String(n),
      '-',
      '-',
      `-${p.amount} NIS`,
      pdfTextCell(details),
      dateStr,
      `-${p.amount} NIS`,
    ];
  }

  private totalRow(totalBalance: number): Content[] {
    const value =
      totalBalance >= 0
        ? `+${totalBalance} NIS`
        : `${totalBalance} NIS`;
    return [
      { text: '', style: 'totalLabel' },
      { text: '', style: 'totalLabel' },
      { text: '', style: 'totalLabel' },
      { text: '', style: 'totalLabel' },
      { text: '', style: 'totalLabel' },
      { text: 'Balance due', style: 'totalLabel', alignment: 'right' },
      { text: value, style: 'totalValue', alignment: 'right' },
    ];
  }
}
