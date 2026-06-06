import {
  Content,
  StyleDictionary,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { containsArabic, pdfLabel, pdfTextCell } from './pdf-arabic.util';
import {
  ClinicBranding,
  PatientPdfContext,
  PaymentStatus,
} from '@core/models/pdf-document.model';

/** Translator function (typically TranslateService.instant bound). */
export type Translator = (key: string, params?: Record<string, unknown>) => string;

export const PDF_CURRENCY = 'NIS';

/** Public marketing domain shown in the footer "address bar". */
export const CLINIC_WELL_DOMAIN = 'clinicwell.app';

/** A4 content width with 40pt left/right page margins. */
const CONTENT_WIDTH = 515;

export function formatMoney(value: number): string {
  return `${value} ${PDF_CURRENCY}`;
}

export function formatSignedMoney(value: number): string {
  return value >= 0 ? `+${value} ${PDF_CURRENCY}` : `${value} ${PDF_CURRENCY}`;
}

export function fullPatientName(p: PatientPdfContext): string {
  return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB');
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}


export const PDF_STYLES: StyleDictionary = {
  title: { fontSize: 16, bold: true },
  subtle: { fontSize: 9, color: '#555555' },
  clinicName: { fontSize: 14, bold: true },
  clinicMeta: { fontSize: 9, color: '#555555' },
  sectionLabel: { fontSize: 10, bold: true, margin: [0, 0, 0, 2] },
  sectionTitle: { fontSize: 12, bold: true, margin: [0, 10, 0, 4] },
  tableHeader: { bold: true, fontSize: 9 },
  badge: { fontSize: 11, bold: true },
  totalLabel: { bold: true },
  totalValue: { bold: true },
  rxTitle: { fontSize: 14, bold: true, margin: [0, 4, 0, 8] },
  letterTitle: { fontSize: 14, bold: true, margin: [0, 4, 0, 10] },
  letterBody: { fontSize: 11, lineHeight: 1.4 },
  footerText: { fontSize: 9 },
  footerSubtle: { fontSize: 7, color: '#888888' },
};

function divider(): Content {
  return {
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: CONTENT_WIDTH,
        y2: 0,
        lineWidth: 0.5,
        lineColor: '#cccccc',
      },
    ],
    margin: [0, 6, 0, 10],
  };
}

function buildHeader(
  branding: ClinicBranding,
  logoDataUrl?: string,
): Content {
  const docInfo: Content[] = [pdfTextCell(branding.doctorName, 'clinicName')];
  if (branding.phone) {
    docInfo.push(pdfTextCell(branding.phone, 'clinicMeta'));
  }
  if (branding.address) {
    docInfo.push(pdfTextCell(branding.address, 'clinicMeta'));
  }

  const columns: Content[] = [];
  if (logoDataUrl) {
    columns.push({ image: logoDataUrl, fit: [120, 60], width: 130 } as Content);
  }

  // Vertically center the name/phone block against the logo height.
  const logoHeight = 50;
  const metaLines = (branding.phone ? 1 : 0) + (branding.address ? 1 : 0);
  const infoHeight = 17 + metaLines * 11;
  const topOffset = logoDataUrl
    ? Math.max(0, Math.round((logoHeight - infoHeight) / 2))
    : 0;

  columns.push({
    stack: docInfo,
    alignment: logoDataUrl ? 'right' : 'left',
    margin: [0, topOffset, 0, 0],
  } as Content);

  return { columns, columnGap: 10 };
}

function buildTitleRow(
  title: string,
  generatedAt: Date,
  qrPayload?: string,
): Content {
  const left: Content = {
    stack: [
      pdfLabel(title, { style: 'title' }),
      { text: formatDateTime(generatedAt), style: 'subtle' },
    ],
  };
  const columns: Content[] = [left];
  if (qrPayload) {
    columns.push({
      qr: qrPayload,
      fit: 92,
      eccLevel: 'L',
      alignment: 'right',
      width: 98,
    } as Content);
  }
  return { columns, margin: [0, 0, 0, 10] };
}

function buildBillBlocks(
  branding: ClinicBranding,
  patient: PatientPdfContext,
  t: Translator,
): Content {
  const from: Content[] = [
    pdfLabel(t('SHARED.INVOICE.BILL_FROM'), { style: 'sectionLabel' }),
    pdfTextCell(branding.doctorName),
  ];
  if (branding.phone) {
    from.push(pdfTextCell(branding.phone));
  }
  if (branding.address) {
    from.push(pdfTextCell(branding.address));
  }

  const to: Content[] = [
    pdfLabel(t('SHARED.INVOICE.BILL_TO'), { style: 'sectionLabel' }),
    pdfTextCell(fullPatientName(patient)),
  ];
  if (patient.phoneNumber) {
    to.push(pdfTextCell(patient.phoneNumber));
  }
  if (patient.address) {
    to.push(pdfTextCell(patient.address));
  }

  // Mirror the layout for RTL (Arabic): bill-from on the right, bill-to on the left.
  const rtl = containsArabic(t('SHARED.INVOICE.BILL_FROM'));
  const fromCol = {
    stack: from,
    alignment: rtl ? 'right' : 'left',
  } as Content;
  const toCol = {
    stack: to,
    alignment: rtl ? 'left' : 'right',
  } as Content;

  return {
    columns: rtl ? [toCol, fromCol] : [fromCol, toCol],
    columnGap: 20,
    margin: [0, 0, 0, 12],
  };
}

function statusLabel(status: PaymentStatus, t: Translator): string {
  switch (status) {
    case 'paid':
      return t('PATIENTS.DOCUMENTS.STATUS_PAID');
    case 'partial':
      return t('PATIENTS.DOCUMENTS.STATUS_PARTIAL');
    default:
      return t('PATIENTS.DOCUMENTS.STATUS_UNPAID');
  }
}

function buildStatusBadge(status: PaymentStatus, t: Translator): Content {
  return pdfLabel(`${t('SHARED.INVOICE.STATUS')} ${statusLabel(status, t)}`, {
    style: 'badge',
    margin: [0, 0, 0, 10],
  });
}

/**
 * Render the marketing URL inside a Chrome-omnibox-style rounded pill so it
 * reads as a browser address bar — easy for people to recognize and type.
 * The domain is also a live link for digital PDF viewers.
 */
function buildWebsiteBar(): Content {
  const barWidth = 188;
  const barHeight = 24;
  return {
    columns: [
      {
        width: barWidth,
        stack: [
          {
            canvas: [
              {
                type: 'rect',
                x: 0,
                y: 0,
                w: barWidth,
                h: barHeight,
                r: 12,
                lineWidth: 0.8,
                lineColor: '#dadce0',
                color: '#f1f3f4',
              },
              // Magnifying-glass lens (stroked circle).
              {
                type: 'ellipse',
                x: 15,
                y: 11,
                r1: 3.8,
                r2: 3.8,
                lineWidth: 1.2,
                lineColor: '#5f6368',
              },
              // Magnifying-glass handle.
              {
                type: 'line',
                x1: 17.8,
                y1: 13.8,
                x2: 21,
                y2: 17,
                lineWidth: 1.2,
                lineColor: '#5f6368',
                lineCap: 'round',
              },
            ],
          },
          {
            text: CLINIC_WELL_DOMAIN,
            link: `https://${CLINIC_WELL_DOMAIN}`,
            alignment: 'center',
            color: '#202124',
            bold: true,
            fontSize: 11,
            relativePosition: { x: 0, y: -18 },
          },
        ],
      },
      { width: '*', text: '' },
    ],
    margin: [0, 6, 0, 0],
  } as Content;
}

function buildFooter(branding: ClinicBranding, t: Translator) {
  return (): Content => ({
    margin: [40, 10, 40, 16],
    columns: [
      {
        width: '*',
        margin: [0, 6, 0, 0],
        stack: [
          pdfLabel(t('PATIENTS.DOCUMENTS.POWERED_BY'), {
            style: 'footerSubtle',
            alignment: 'left',
          }),
          buildWebsiteBar(),
        ],
      },
      {
        width: 180,
        margin: [0, 27, 0, 0],
        stack: [
          pdfLabel(branding.doctorName, {
            style: 'footerText',
            alignment: 'center',
            margin: [0, 0, 0, 7],
          }),
          {
            canvas: [
              {
                type: 'line',
                x1: 0,
                y1: 0,
                x2: 160,
                y2: 0,
                lineWidth: 0.5,
                lineColor: '#999999',
              },
            ],
          },
        ],
      },
    ],
    columnGap: 16,
  });
}

export interface BaseDocumentOptions {
  title: string;
  branding: ClinicBranding;
  logoDataUrl?: string;
  patient?: PatientPdfContext;
  generatedAt: Date;
  qrPayload?: string;
  status?: PaymentStatus;
  /** Main document content rendered after the meta/bill blocks. */
  body: Content[];
}

/**
 * Assemble a branded A4 document: header (logo + doctor), title + optional QR,
 * optional bill from/to, optional status badge, body, and a footer that always
 * carries the blank signature/stamp area.
 */
export function buildBrandedDocument(
  opts: BaseDocumentOptions,
  t: Translator,
): TDocumentDefinitions {
  const content: Content[] = [
    buildHeader(opts.branding, opts.logoDataUrl),
    divider(),
    buildTitleRow(opts.title, opts.generatedAt, opts.qrPayload),
  ];

  if (opts.patient) {
    content.push(buildBillBlocks(opts.branding, opts.patient, t));
  }
  if (opts.status) {
    content.push(buildStatusBadge(opts.status, t));
  }
  content.push(...opts.body);

  return {
    pageSize: 'A4',
    pageMargins: [40, 48, 40, 104],
    content,
    footer: buildFooter(opts.branding, t),
    defaultStyle: { font: 'Roboto', fontSize: 9 },
    styles: PDF_STYLES,
  };
}
