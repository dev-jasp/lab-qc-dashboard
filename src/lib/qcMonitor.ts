import { getControlMonitorSeed } from '@/constants/monitor-config';
import { initializeEntries, initializeLots } from '@/lib/qcStorage';
import type {
  ChartDataPoint,
  ControlTypeSlug,
  DiseaseSlug,
  LotMetadata,
  QCEntry,
  QCParameters,
  QCStatistics,
  RunStatisticsSummary,
} from '@/types/qc.types';

export const DEFAULT_IN_HOUSE_LOT_NUMBER = 'INHOUSE';

const CONTROL_CODES: Record<ControlTypeSlug, string> = {
  'in-house-control': 'IHC',
  'positive-control': 'PC',
  'negative-control': 'NC',
};

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getSeedLotNumber(disease: DiseaseSlug, controlType: ControlTypeSlug): string {
  const monitorSeed = getControlMonitorSeed(disease, controlType);

  if (controlType === 'in-house-control') {
    return DEFAULT_IN_HOUSE_LOT_NUMBER;
  }

  return monitorSeed.lotNumber ?? `${disease.toUpperCase().slice(0, 3)}-LOT-001`;
}

export function getControlParameters(disease: DiseaseSlug, controlType: ControlTypeSlug): QCParameters {
  return getControlMonitorSeed(disease, controlType).parameters;
}

export function getControlCode(controlType: ControlTypeSlug): string {
  return CONTROL_CODES[controlType];
}

export function buildSeedEntries(disease: DiseaseSlug, controlType: ControlTypeSlug): QCEntry[] {
  const monitorSeed = getControlMonitorSeed(disease, controlType);
  const lotNumber = getSeedLotNumber(disease, controlType);
  const controlCode = getControlCode(controlType);

  return monitorSeed.data.map((point, index) => ({
    id: crypto.randomUUID(),
    date: point.timestamp,
    protocolNumber: point.sample,
    odValue: point.value,
    lotNumber,
    controlCode,
    runNumber: String(index + 1).padStart(2, '0'),
    vialNumber: `V${String(index + 1).padStart(2, '0')}`,
    flag: null,
    notes: null,
    editedAt: null,
    editReason: null,
    signedBy: null,
    signedAt: null,
  }));
}

export function buildSeedLots(disease: DiseaseSlug, controlType: ControlTypeSlug): LotMetadata[] {
  if (controlType === 'in-house-control') {
    return [];
  }

  const monitorSeed = getControlMonitorSeed(disease, controlType);

  return [
    {
      lotNumber: getSeedLotNumber(disease, controlType),
      startDate: monitorSeed.lotStartDate ?? monitorSeed.data.at(0)?.timestamp ?? getTodayIsoDate(),
      endDate: null,
      expiryDate: null,
      status: 'active',
      notes: 'Initial seeded reagent lot',
    },
  ];
}

export async function ensureControlDatasetInitialized(
  disease: DiseaseSlug,
  controlType: ControlTypeSlug,
): Promise<void> {
  const seedEntries = buildSeedEntries(disease, controlType);

  if (controlType === 'in-house-control') {
    await initializeEntries(disease, controlType, seedEntries);
    return;
  }

  const seedLots = buildSeedLots(disease, controlType);
  const seedLotNumber = seedLots[0]?.lotNumber;

  await initializeLots(disease, controlType, seedLots);
  await initializeEntries(disease, controlType, seedEntries, seedLotNumber);
}

export function entriesToChartData(entries: QCEntry[]): ChartDataPoint[] {
  return entries.map((entry) => ({
    sample: entry.protocolNumber,
    value: entry.odValue,
    timestamp: entry.date,
    isEdited: entry.editedAt !== null,
    isFlagged: entry.flag !== null,
  }));
}

export function buildRunStatisticsSummary(
  chartData: ChartDataPoint[],
  statistics: QCStatistics,
): RunStatisticsSummary {
  const sum = chartData.reduce((total, point) => total + point.value, 0);
  const lastOD = chartData.length > 0 ? chartData[chartData.length - 1].value : null;
  const cv = statistics.mean > 0 ? (statistics.sd / statistics.mean) * 100 : 0;
  const confidence =
    chartData.length === 0
      ? 0
      : statistics.sd === 0
        ? 100
        : (chartData.filter((point) => Math.abs(point.value - statistics.mean) <= 2 * statistics.sd).length /
            chartData.length) *
          100;

  return {
    mean: statistics.mean,
    sd: statistics.sd,
    sum,
    cv,
    lastOD,
    totalRuns: chartData.length,
    confidence,
  };
}
