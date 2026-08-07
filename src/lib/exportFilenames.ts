import type { ExportStream } from '@/lib/exportCatalog';

export type ExportExtension = 'csv' | 'xlsx' | 'pdf';

/** Keeps filenames safe across platforms while preserving readable word breaks. */
function toFilenameToken(value: string): string {
  return value
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * `{Disease}-{ControlType}-{LotNumber}-QC-Data-{YYYY-MM-DD}.{ext}`
 * per the ZCMC export contract in AGENTS.md.
 */
export function buildStreamFilename(stream: ExportStream, extension: ExportExtension): string {
  const parts = [
    toFilenameToken(stream.diseaseName),
    toFilenameToken(stream.controlShortLabel),
    toFilenameToken(stream.partitionId),
    'QC-Data',
    getTodayIsoDate(),
  ].filter((part) => part.length > 0);

  return `${parts.join('-')}.${extension}`;
}

/** `{Disease}-QC-Report-{Period}-{YYYY}.{ext}` for whole-disease reports. */
export function buildDiseaseReportFilename(
  diseaseName: string,
  period: string,
  extension: ExportExtension,
): string {
  const parts = [
    toFilenameToken(diseaseName),
    'QC-Report',
    toFilenameToken(period),
    String(new Date().getFullYear()),
  ].filter((part) => part.length > 0);

  return `${parts.join('-')}.${extension}`;
}
