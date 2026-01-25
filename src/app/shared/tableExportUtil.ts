import * as XLSX from 'xlsx';
import { TableElement } from './TableElement';

const getFileName = (name: string) => {
  const timeSpan = new Date().toISOString();
  const sheetName = name || 'ExportResult';
  const fileName = `${sheetName}-${timeSpan}`;
  return {
    sheetName,
    fileName,
  };
};
export class TableExportUtil {
  static exportToExcel(arr: Partial<TableElement>[], name: string) {
    const { sheetName, fileName } = getFileName(name);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(arr);
    const headers = arr.length ? Object.keys(arr[0]) : [];
    if (headers.length) {
      const columnWidths = headers.map((header) => {
        let maxLength = header.length;
        arr.forEach((row) => {
          const value = row[header as keyof TableElement];
          const text = value === null || value === undefined ? '' : String(value);
          const longestLine = text
            .split('\n')
            .reduce((max, line) => Math.max(max, line.length), 0);
          maxLength = Math.max(maxLength, longestLine);
        });
        return { wch: Math.min(60, Math.max(12, maxLength + 2)) };
      });
      ws['!cols'] = columnWidths;
    }
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }

  // static exportToPDF(exportData: any[]) {
  //   const doc = new jsPDF();
  //   const dataValue: any = Object.keys(exportData).map(function (
  //     personNamedIndex: any
  //   ) {
  //     return Object.values(exportData[personNamedIndex]);
  //   });
  //   const keys: any = Object.keys(exportData[0]);

  //   autoTable(doc, {
  //     head: [keys],
  //     body: dataValue,
  //   });

  //   const { fileName } = getFileName('pdf');

  //   doc.save(`${fileName}.pdf`);
  // }
}
