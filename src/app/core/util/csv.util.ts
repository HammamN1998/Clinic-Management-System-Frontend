export type CsvCell = string | number | null;

/** Spreadsheets run a cell that starts with one of these as a formula. */
const FORMULA_START = /^[=+@\t\r-]/;

function csvCell(value: CsvCell): string {
  if (value === null) {
    return '';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  const text = FORMULA_START.test(value) ? `'${value}` : value;
  // Always quoted, so that no separator in the text starts a new cell, not even the semicolon Excel splits on in many regions.
  return `"${text.replace(/"/g, '""')}"`;
}

/** Saves the rows as a CSV file. It starts with a byte order mark so that Excel reads it as UTF-8 and shows Arabic. */
export function downloadCsv(fileName: string, rows: CsvCell[][]): void {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Some browsers read the file only after click() has returned.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
