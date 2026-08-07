import { triggerDownload } from '@/lib/downloadFile';
import type { ExportStream } from '@/lib/exportCatalog';
import { buildStreamSheetRows, DATA_COLUMN_HEADERS } from '@/lib/exportRows';

/** Excel caps sheet names at 31 chars and rejects : \ / ? * [ ]. */
function toSheetName(stream: ExportStream): string {
  return `${stream.controlShortLabel} ${stream.partitionId}`
    .replace(/[:\\/?*[\]]/g, '-')
    .slice(0, 31);
}

const COLUMN_WIDTHS = DATA_COLUMN_HEADERS.map((header) => ({
  wch: Math.max(header.length + 2, 14),
}));

/**
 * SheetJS is ~800KB, so it is dynamically imported and only pulled in when the
 * user actually asks for an Excel file.
 *
 * Note: the community build cannot embed images, so the ZCMC letterhead is
 * emitted as text rows here. The PNG logos appear in PDF exports only.
 */
async function buildWorkbook(streams: ExportStream[]) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  streams.forEach((stream) => {
    const worksheet = XLSX.utils.aoa_to_sheet(buildStreamSheetRows(stream));
    worksheet['!cols'] = COLUMN_WIDTHS;

    // Sheet names must be unique within a workbook.
    let sheetName = toSheetName(stream);
    let suffix = 2;
    while (usedNames.has(sheetName)) {
      sheetName = `${toSheetName(stream).slice(0, 28)}-${suffix}`;
      suffix += 1;
    }
    usedNames.add(sheetName);

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  const buffer: ArrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export async function downloadStreamXlsx(stream: ExportStream, filename: string): Promise<void> {
  triggerDownload(await buildWorkbook([stream]), filename);
}

/** One workbook per disease, with a sheet per control stream. */
export async function downloadDiseaseXlsx(streams: ExportStream[], filename: string): Promise<void> {
  triggerDownload(await buildWorkbook(streams), filename);
}
