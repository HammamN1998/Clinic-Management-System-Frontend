import { Injectable } from '@angular/core';
import {from} from "rxjs";
import html2canvas from "html2canvas";
import JsPdf from "jspdf";

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

}
