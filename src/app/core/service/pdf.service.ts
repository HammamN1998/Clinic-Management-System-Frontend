import { Injectable } from '@angular/core';
import {from} from "rxjs";
import html2canvas from "html2canvas";
import JsPdf from "jspdf";
import * as pdfMake from 'pdfmake/build/pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import {PaymentModel} from "@core/models/payment.model";
import {AppointmentModel} from "@core/models/appointment.model";
import {TreatmentModel} from "@core/models/treatment.model";

export interface InvoiceItem {
  number: string;
  treatment: string;
  discount: string;
  payment: string;
  details: string;
  date: string;
  total: string;
}

interface Invoice {
  id: string;                 // e.g., INV-2025-000123
  patientName: string;
  patientId?: string;
  doctorName?: string;
  date: string;               // ISO or formatted
  currency: 'USD' | 'ILS' | 'EUR';
  items: InvoiceItem[];
  clinic: { name: string; address: string; phone?: string; logoDataUrl?: string };
}

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  constructor() { }

  // TODO: This method mechanism is not convenient for long table because its convert the component to an image then insert it inside th PDF, if the image is huge, only part of it will be shown as the whole generated PDF is one page.
  generatePatientBalanceInvoice() {
    const componentElement = document.getElementById('balance-table');

    from(html2canvas(componentElement!))
    .subscribe((canvas) => {
      const imgWidth = 208;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      const contentDataURL = canvas.toDataURL('image/png')
      const pdf = new JsPdf('p', 'mm', 'a4');
      const position = 0;
      pdf.addImage(contentDataURL, 'PNG', 0, position, imgWidth, imgHeight)
      pdf.save('skill-set.pdf');
    });
  }

  generatePatientPDFInvoice(payments: PaymentModel[], appointments: AppointmentModel[], treatments: TreatmentModel[]) {
    // Build table body
    const invItems = [];
    payments.forEach(payment => {
      invItems.push([
        { text: '#', style: 'th' },
        { text: '-', style: 'th', alignment: 'center' },
        { text: '-', style: 'th', alignment: 'center' },
        { text: payment.amount.toString(), style: 'th', alignment: 'center' },
        { text: payment.details, style: 'th', alignment: 'center' },
        { text: payment.date, style: 'th', alignment: 'center' },
        { text: payment.amount.toString(), style: 'th', alignment: 'center' },
      ])
    });

    appointments.forEach(appointment => {
      if(!appointment.costPaid) {
        invItems.push([
          { text: '#', style: 'th' },
          { text: appointment.cost.toString(), style: 'th', alignment: 'center' },
          { text: '-', style: 'th', alignment: 'center' },
          { text: '-', style: 'th', alignment: 'center' },
          { text: appointment.details, style: 'th', alignment: 'center' },
          { text: appointment.date, style: 'th', alignment: 'center' },
          { text: appointment.cost.toString(), style: 'th', alignment: 'center' },
        ])
      }
    });

    treatments.forEach((treatment) => {
      invItems.push([
        { text: '#', style: 'th' },
        { text: treatment.price.toString(), style: 'th', alignment: 'center' },
        { text: treatment.discount.toString(), style: 'th', alignment: 'center' },
        { text: '-', style: 'th', alignment: 'center' },
        { text: treatment.details, style: 'th', alignment: 'center' },
        { text: treatment.date, style: 'th', alignment: 'center' },
        { text: (treatment.price-treatment.discount).toString(), style: 'th', alignment: 'center' },
      ])
    });

    const tableBody: any[] = [
      // First Row (header)
      [
        { text: '#', style: 'th' },
        { text: 'Treatment', style: 'th', alignment: 'center' },
        { text: 'Discount', style: 'th', alignment: 'center' },
        { text: 'Payment', style: 'th', alignment: 'center' },
        { text: 'Description', style: 'th', alignment: 'center' },
        { text: 'Date', style: 'th', alignment: 'center' },
        { text: 'Total', style: 'th', alignment: 'center' },
      ]
    ];



  }

  money(n: number, currency: Invoice['currency']) {
    const map = { USD: '$', ILS: '₪', EUR: '€' } as const;
    return `${map[currency]} ${n.toFixed(2)}`;
  }

}
