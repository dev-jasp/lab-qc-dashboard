import {
  CONTROL_DEFINITIONS,
  DISEASE_DEFINITIONS,
  getControlDefinition,
} from '@/constants/monitor-config';
import {
  ensureControlDatasetInitialized,
  entriesToChartData,
  getControlCode,
  getControlParameters,
} from '@/lib/qcMonitor';
import { getEntries, getInHouseBatches, getLots } from '@/lib/qcStorage';
import { calculateStatistics } from '@/utils/qc-calculations';
import type {
  ControlTypeSlug,
  DiseaseSlug,
  QCEntry,
  QCParameters,
  QCStatistics,
} from '@/types/qc.types';

/**
 * One downloadable unit: a single disease + control + lot (or in-house batch).
 * This is the same partition the monitor page works with, so an export always
 * matches exactly what `/monitor/:disease/:control` shows for that lot.
 */
export type ExportStream = {
  disease: DiseaseSlug;
  diseaseName: string;
  assayTag: string;
  controlType: ControlTypeSlug;
  controlLabel: string;
  controlShortLabel: string;
  controlCode: string;
  partitionKind: 'lot' | 'batch';
  partitionId: string;
  partitionStatus: 'active' | 'archived';
  startDate: string;
  /** Archival date, or null while the lot/batch is still active. */
  endDate: string | null;
  /** Reagent expiry. Always null for in-house batches, which have no expiry. */
  expiryDate: string | null;
  notes: string | null;
  entries: QCEntry[];
  runCount: number;
  lastRunDate: string | null;
  statistics: QCStatistics;
  cv: number;
  parameters: QCParameters;
};

export type DiseaseExportGroup = {
  disease: DiseaseSlug;
  diseaseName: string;
  assayTag: string;
  streams: ExportStream[];
  totalRuns: number;
  lastRunDate: string | null;
};

export type DateRange = {
  from: string | null;
  to: string | null;
};

/**
 * Entry dates are plain ISO `YYYY-MM-DD` strings, so lexicographic comparison is
 * already chronological. Matches the sorting convention used across qcStorage.
 */
function sortEntriesByDate(entries: QCEntry[]): QCEntry[] {
  return [...entries].sort((first, second) => first.date.localeCompare(second.date));
}

function getLastRunDate(entries: QCEntry[]): string | null {
  return entries.length > 0 ? entries[entries.length - 1].date : null;
}

type StreamInput = {
  disease: DiseaseSlug;
  diseaseName: string;
  assayTag: string;
  controlType: ControlTypeSlug;
  partitionKind: 'lot' | 'batch';
  partitionId: string;
  partitionStatus: 'active' | 'archived';
  startDate: string;
  endDate: string | null;
  expiryDate: string | null;
  notes: string | null;
  entries: QCEntry[];
};

function buildStream({
  disease,
  diseaseName,
  assayTag,
  controlType,
  partitionKind,
  partitionId,
  partitionStatus,
  startDate,
  endDate,
  expiryDate,
  notes,
  entries,
}: StreamInput): ExportStream {
  const controlDefinition = getControlDefinition(controlType);
  const sortedEntries = sortEntriesByDate(entries);
  const statistics = calculateStatistics(entriesToChartData(sortedEntries));

  return {
    disease,
    diseaseName,
    assayTag,
    controlType,
    controlLabel: controlDefinition?.label ?? controlType,
    controlShortLabel: controlDefinition?.shortLabel ?? controlType,
    controlCode: getControlCode(controlType),
    partitionKind,
    partitionId,
    partitionStatus,
    startDate,
    endDate,
    expiryDate,
    notes,
    entries: sortedEntries,
    runCount: sortedEntries.length,
    lastRunDate: getLastRunDate(sortedEntries),
    statistics,
    cv: statistics.mean > 0 ? (statistics.sd / statistics.mean) * 100 : 0,
    parameters: getControlParameters(disease, controlType),
  };
}

function buildGroup(disease: DiseaseSlug, diseaseName: string, assayTag: string, streams: ExportStream[]): DiseaseExportGroup {
  const lastRunDates = streams
    .map((stream) => stream.lastRunDate)
    .filter((date): date is string => date !== null)
    .sort((first, second) => first.localeCompare(second));

  return {
    disease,
    diseaseName,
    assayTag,
    streams,
    totalRuns: streams.reduce((total, stream) => total + stream.runCount, 0),
    lastRunDate: lastRunDates.at(-1) ?? null,
  };
}

async function buildControlStreams(
  disease: DiseaseSlug,
  diseaseName: string,
  assayTag: string,
  controlType: ControlTypeSlug,
): Promise<ExportStream[]> {
  // Seeds on first visit exactly as the monitor page does, so /reports never
  // renders an empty catalog against a cold localStorage.
  await ensureControlDatasetInitialized(disease, controlType);

  if (controlType === 'in-house-control') {
    const batches = await getInHouseBatches(disease);

    return Promise.all(
      batches.map(async (batch) => {
        const entries = await getEntries(disease, controlType, batch.batchId);

        return buildStream({
          disease,
          diseaseName,
          assayTag,
          controlType,
          partitionKind: 'batch',
          partitionId: batch.batchId,
          partitionStatus: batch.status,
          startDate: batch.startDate,
          endDate: batch.endDate,
          // InHouseBatchMetadata has no expiry — batches are lab-made, not reagent kits.
          expiryDate: null,
          notes: batch.notes,
          entries,
        });
      }),
    );
  }

  const lots = await getLots(disease, controlType);

  return Promise.all(
    lots.map(async (lot) => {
      const entries = await getEntries(disease, controlType, lot.lotNumber);

      return buildStream({
        disease,
        diseaseName,
        assayTag,
        controlType,
        partitionKind: 'lot',
        partitionId: lot.lotNumber,
        partitionStatus: lot.status,
        startDate: lot.startDate,
        endDate: lot.endDate,
        expiryDate: lot.expiryDate,
        notes: lot.notes,
        entries,
      });
    }),
  );
}

/**
 * Reads every disease x control x lot/batch partition out of qcStorage and
 * derives the statistics each export format needs.
 */
export async function buildExportCatalog(): Promise<DiseaseExportGroup[]> {
  return Promise.all(
    DISEASE_DEFINITIONS.map(async (disease) => {
      const controlStreams = await Promise.all(
        CONTROL_DEFINITIONS.map((control) =>
          buildControlStreams(disease.slug, disease.name, disease.assayTag, control.slug),
        ),
      );

      return buildGroup(disease.slug, disease.name, disease.assayTag, controlStreams.flat());
    }),
  );
}

/**
 * Narrows every stream to the given ISO date window and recomputes its
 * statistics, so a filtered view reports the mean/SD/CV of what it shows.
 */
export function filterCatalogByDateRange(
  groups: DiseaseExportGroup[],
  { from, to }: DateRange,
): DiseaseExportGroup[] {
  if (from === null && to === null) {
    return groups;
  }

  return groups.map((group) => {
    const streams = group.streams.map((stream) => {
      const entries = stream.entries.filter(
        (entry) => (from === null || entry.date >= from) && (to === null || entry.date <= to),
      );

      if (entries.length === stream.entries.length) {
        return stream;
      }

      const statistics = calculateStatistics(entriesToChartData(entries));

      return {
        ...stream,
        entries,
        runCount: entries.length,
        lastRunDate: getLastRunDate(entries),
        statistics,
        cv: statistics.mean > 0 ? (statistics.sd / statistics.mean) * 100 : 0,
      };
    });

    return buildGroup(group.disease, group.diseaseName, group.assayTag, streams);
  });
}

/** Stable identity for a stream, used for React keys and per-row busy state. */
export function buildStreamKey(stream: ExportStream): string {
  return `${stream.disease}:${stream.controlType}:${stream.partitionId}`;
}

/** Active lots/batches only — the default 3-row-per-disease view. */
export function selectActiveStreams(streams: ExportStream[]): ExportStream[] {
  return streams.filter((stream) => stream.partitionStatus === 'active');
}

export function countStreams(groups: DiseaseExportGroup[]): number {
  return groups.reduce((total, group) => total + group.streams.length, 0);
}

export function countRuns(groups: DiseaseExportGroup[]): number {
  return groups.reduce((total, group) => total + group.totalRuns, 0);
}
