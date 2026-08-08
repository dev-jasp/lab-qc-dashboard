import type { ExportStream } from '@/lib/exportCatalog';
import { formatBenchName } from '@/lib/staffDirectory';
import { calculateZScore } from '@/utils/qc-calculations';

/**
 * The ZCMC institutional header. Kept here so CSV and Excel emit byte-identical
 * text and the mandated wording lives in exactly one place.
 */
export const ZCMC_HEADER_LINES: readonly string[] = [
  'ZAMBOANGA CITY MEDICAL CENTER',
  'Department of Pathology and Laboratory Medicine',
  'Dr. D. Evangelista St. Sta. Catalina, 7000 Zamboanga City',
  'Vaccine Preventable Disease Referral Laboratory (VPDRL)',
  'EIA QUALITY CONTROL GRAPH',
];

/** Column order mandated by the ZCMC export contract. */
export const DATA_COLUMN_HEADERS: readonly string[] = [
  'Date of experiment',
  'Control code / Run number / Vial number',
  'Protocol number',
  'OD',
  'Lot Number',
  'Performed By',
  'Validated By',
  'Remarks',
  'Z-Score',
];

/**
 * Attribution as the bench writes it ("A. Reyes"), matching the worksheets
 * these reports are filed alongside. Entries recorded before the field existed
 * carry nobody, which prints as an em dash rather than an empty cell — a blank
 * reads as a missing column, not a missing person.
 */
const formatAttribution = (name: string | null): string =>
  name?.trim() ? formatBenchName(name) : '—';

/** OD values are always 4 decimal places. */
const formatOD = (value: number): string => value.toFixed(4);
/** Derived statistics are always 3 decimal places. */
const formatStatistic = (value: number): string => value.toFixed(3);
/** CV is always 2 decimal places with a percent suffix. */
const formatCV = (value: number): string => `${value.toFixed(2)}%`;

export function buildTitleRow(stream: ExportStream): string {
  const partitionLabel = stream.partitionKind === 'batch' ? 'Batch' : 'Lot';

  return `${stream.diseaseName.toUpperCase()} - ${stream.controlLabel.toUpperCase()} - ${partitionLabel} ${stream.partitionId}`;
}

/**
 * Statistics block rendered above the data table: SUM/Mean/SD/CV% on the left,
 * the six SD boundaries on the right.
 */
export function buildStatisticsRows(stream: ExportStream): string[][] {
  const { mean, sd } = stream.statistics;
  const sum = stream.entries.reduce((total, entry) => total + entry.odValue, 0);

  return [
    ['SUM', formatStatistic(sum), '', 'Mean+1SD', formatStatistic(mean + sd)],
    ['Mean', formatStatistic(mean), '', 'Mean-1SD', formatStatistic(mean - sd)],
    ['SD', formatStatistic(sd), '', 'Mean+2SD', formatStatistic(mean + 2 * sd)],
    ['CV%', formatCV(stream.cv), '', 'Mean-2SD', formatStatistic(mean - 2 * sd)],
    ['Total Runs', String(stream.runCount), '', 'Mean+3SD', formatStatistic(mean + 3 * sd)],
    ['', '', '', 'Mean-3SD', formatStatistic(mean - 3 * sd)],
  ];
}

export function buildDataRows(stream: ExportStream): string[][] {
  const { mean, sd } = stream.statistics;
  const resolvedMean = stream.runCount > 0 ? mean : stream.parameters.targetMean;
  const resolvedSD = stream.runCount > 1 && sd > 0 ? sd : stream.parameters.targetSD;

  return stream.entries.map((entry) => [
    entry.date,
    `${entry.controlCode} / ${entry.runNumber} / ${entry.vialNumber}`,
    entry.protocolNumber,
    formatOD(entry.odValue),
    entry.lotNumber,
    formatAttribution(entry.performedBy),
    formatAttribution(entry.validatedBy),
    entry.notes ?? '',
    formatStatistic(calculateZScore(entry.odValue, resolvedMean, resolvedSD)),
  ]);
}

/**
 * The full sheet for one control stream: letterhead, title, statistics block,
 * then the data table.
 */
export function buildStreamSheetRows(stream: ExportStream): string[][] {
  return [
    ...ZCMC_HEADER_LINES.map((line) => [line]),
    [],
    [buildTitleRow(stream)],
    [],
    ...buildStatisticsRows(stream),
    [],
    [...DATA_COLUMN_HEADERS],
    ...buildDataRows(stream),
  ];
}
