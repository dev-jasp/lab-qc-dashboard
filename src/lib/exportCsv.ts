import { triggerDownload } from '@/lib/downloadFile';
import type { ExportStream } from '@/lib/exportCatalog';
import { buildStreamSheetRows } from '@/lib/exportRows';

/**
 * Excel reads UTF-8 CSV as the system codepage unless it sees a byte order
 * mark, which mangles the letterhead. Prepending one keeps the header readable.
 */
const UTF8_BOM = String.fromCharCode(0xfeff);

const escapeCSVCell = (value: string): string => `"${value.replace(/"/g, '""')}"`;

function toCSV(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => escapeCSVCell(cell)).join(',')).join('\r\n');
}

function toCSVBlob(csv: string): Blob {
  return new Blob([UTF8_BOM, csv], { type: 'text/csv;charset=utf-8;' });
}

export function downloadStreamCsv(stream: ExportStream, filename: string): void {
  triggerDownload(toCSVBlob(toCSV(buildStreamSheetRows(stream))), filename);
}

/**
 * One CSV covering every control stream of a disease. CSV has no sheets, so the
 * streams are stacked with blank separator rows between them.
 */
export function downloadDiseaseCsv(streams: ExportStream[], filename: string): void {
  const rows = streams.flatMap((stream, index) => {
    const sheetRows = buildStreamSheetRows(stream);

    return index === 0 ? sheetRows : [[], [], ...sheetRows];
  });

  triggerDownload(toCSVBlob(toCSV(rows)), filename);
}
