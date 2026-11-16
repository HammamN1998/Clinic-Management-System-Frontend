/** A cell: text, a number, or nothing. */
export type SheetCell = string | number | null;

export interface SheetOptions {
  /** The sheet's tab. */
  name: string;
  /** Each column's width, in characters. */
  widths: number[];
  /** Rows in bold, such as the header and a total, by index. */
  boldRows?: number[];
  /** Columns whose numbers are fractions to show as percentages, such as 0.125 as 12.50%, by index. */
  percentColumns?: number[];
  rightToLeft?: boolean;
}

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const PACKAGE_RELS_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const OFFICE_RELS_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
/** Excel holds at most this many characters in a cell. */
const CELL_MAX_LENGTH = 32767;
const SHEET_NAME_MAX_LENGTH = 31;

const CONTENT_TYPES =
  `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  '</Types>';

const PACKAGE_RELS =
  `${XML_HEADER}<Relationships xmlns="${PACKAGE_RELS_NS}">` +
  `<Relationship Id="rId1" Type="${OFFICE_RELS_NS}/officeDocument" Target="xl/workbook.xml"/>` +
  '</Relationships>';

const WORKBOOK_RELS =
  `${XML_HEADER}<Relationships xmlns="${PACKAGE_RELS_NS}">` +
  `<Relationship Id="rId1" Type="${OFFICE_RELS_NS}/worksheet" Target="worksheets/sheet1.xml"/>` +
  `<Relationship Id="rId2" Type="${OFFICE_RELS_NS}/styles" Target="styles.xml"/>` +
  '</Relationships>';

/** Cell formats by index: plain, bold, percent, and bold percent, so a cell's is the sum of bold (1) and percent (2). */
const STYLES =
  `${XML_HEADER}<styleSheet xmlns="${MAIN_NS}">` +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="4">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="10" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/>' +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>';

/** XML has no place for most control characters, and Excel calls a file holding one corrupt. */
// eslint-disable-next-line no-control-regex
const INVALID_XML_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

const encoder = new TextEncoder();

function escapeXml(text: string): string {
  return text
    .replace(INVALID_XML_CHARACTERS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(text: string, maxLength: number): string {
  const characters = Array.from(text);
  return characters.length > maxLength ? characters.slice(0, maxLength).join('') : text;
}

/** Excel refuses a sheet name that is blank, longer than 31 characters, holds \ / ? * [ ] or :, or starts or ends with '. */
function sheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, ' ').replace(/^'+|'+$/g, '').trim();
  return truncate(cleaned, SHEET_NAME_MAX_LENGTH).trim() || 'Sheet1';
}

/** 0 is A, 25 is Z, 26 is AA. */
function columnName(index: number): string {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

function workbookXml(name: string): string {
  return (
    `${XML_HEADER}<workbook xmlns="${MAIN_NS}" xmlns:r="${OFFICE_RELS_NS}">` +
    `<sheets><sheet name="${escapeXml(sheetName(name))}" sheetId="1" r:id="rId1"/></sheets>` +
    '</workbook>'
  );
}

function sheetXml(rows: SheetCell[][], options: SheetOptions): string {
  const boldRows = new Set(options.boldRows ?? []);
  const percentColumns = new Set(options.percentColumns ?? []);
  const columns = options.widths
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join('');
  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          const style = (boldRows.has(rowIndex) ? 1 : 0) + (percentColumns.has(columnIndex) ? 2 : 0);
          const attributes = `r="${columnName(columnIndex)}${rowIndex + 1}"${style ? ` s="${style}"` : ''}`;
          if (typeof value === 'number' && Number.isFinite(value)) {
            return `<c ${attributes}><v>${value}</v></c>`;
          }
          if (typeof value === 'string' && value !== '') {
            const text = escapeXml(truncate(value, CELL_MAX_LENGTH));
            return `<c ${attributes} t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
          }
          return '';
        })
        .join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join('');
  return (
    `${XML_HEADER}<worksheet xmlns="${MAIN_NS}">` +
    `<sheetViews><sheetView workbookViewId="0"${options.rightToLeft ? ' rightToLeft="1"' : ''}/></sheetViews>` +
    (columns ? `<cols>${columns}</cols>` : '') +
    `<sheetData>${sheetRows}</sheetData>` +
    '</worksheet>'
  );
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** A zip archive with its files stored uncompressed, which is all an .xlsx needs. */
function zip(files: { name: string; data: Uint8Array }[], modified: Date): Blob {
  const time = (modified.getHours() << 11) | (modified.getMinutes() << 5) | (modified.getSeconds() >> 1);
  const date = ((modified.getFullYear() - 1980) << 9) | ((modified.getMonth() + 1) << 5) | modified.getDate();
  const entries: BlobPart[] = [];
  const directory: BlobPart[] = [];
  let offset = 0;
  let directorySize = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const size = file.data.length;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, size, true);
    local.setUint32(22, size, true);
    local.setUint16(26, name.length, true);
    entries.push(local.buffer, name, file.data);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(12, time, true);
    central.setUint16(14, date, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, size, true);
    central.setUint32(24, size, true);
    central.setUint16(28, name.length, true);
    central.setUint32(42, offset, true);
    directory.push(central.buffer, name);

    offset += 30 + name.length + size;
    directorySize += 46 + name.length;
  }
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, directorySize, true);
  end.setUint32(16, offset, true);
  return new Blob([...entries, ...directory, end.buffer], { type: XLSX_TYPE });
}

function buildXlsx(rows: SheetCell[][], options: SheetOptions): Blob {
  const parts: [string, string][] = [
    ['[Content_Types].xml', CONTENT_TYPES],
    ['_rels/.rels', PACKAGE_RELS],
    ['xl/workbook.xml', workbookXml(options.name)],
    ['xl/_rels/workbook.xml.rels', WORKBOOK_RELS],
    ['xl/styles.xml', STYLES],
    ['xl/worksheets/sheet1.xml', sheetXml(rows, options)],
  ];
  return zip(
    parts.map(([name, xml]) => ({ name, data: encoder.encode(xml) })),
    new Date(),
  );
}

/** Saves the rows as an Excel workbook of one sheet. Text is stored as text, so a cell that looks like a formula is never run. */
export function downloadXlsx(fileName: string, rows: SheetCell[][], options: SheetOptions): void {
  const url = URL.createObjectURL(buildXlsx(rows, options));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Some browsers read the file only after click() has returned.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
