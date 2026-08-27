import { getControlMonitorSeed, getPriorLotSeed } from '@/constants/monitor-config';
import {
  addViolation,
  initializeEntries,
  initializeInHouseBatches,
  initializeLots,
} from '@/lib/qcStorage';
import { pickSeedPerformer, pickSeedValidator } from '@/lib/staffSeed';
import { calculateStatistics, evaluateQCRules } from '@/utils/qc-calculations';
import type {
  ChartDataPoint,
  ControlTypeSlug,
  CorrectiveAction,
  CorrectiveRootCause,
  DiseaseSlug,
  LotMetadata,
  QCEntry,
  QCParameters,
  QCStatistics,
  RunStatisticsSummary,
  ViolationEntry,
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

  return buildEntriesFromSeries(
    disease,
    controlType,
    monitorSeed.data,
    getSeedLotNumber(disease, controlType),
  );
}

/**
 * QC entries for the lot — or, for in-house, the batch — this stream replaced.
 *
 * Returns an empty array when the stream has no prior partition to seed.
 */
export function buildSeedPriorEntries(
  disease: DiseaseSlug,
  controlType: ControlTypeSlug,
): QCEntry[] {
  const priorSeed = getPriorLotSeed(disease, controlType);

  if (priorSeed === null) {
    return [];
  }

  return buildEntriesFromSeries(
    disease,
    controlType,
    priorSeed.data,
    priorSeed.lotNumber,
    `${disease}:${controlType}:prior-lot`,
  );
}

function buildEntriesFromSeries(
  disease: DiseaseSlug,
  controlType: ControlTypeSlug,
  data: ChartDataPoint[],
  lotNumber: string,
  performerKey: string = `${disease}:${controlType}`,
): QCEntry[] {
  const controlCode = getControlCode(controlType);
  const streamKey = performerKey;

  return data.map((point, index) => {
    const performer = pickSeedPerformer(streamKey, index);
    const validator = pickSeedValidator(streamKey, index);

    return {
      id: crypto.randomUUID(),
      date: point.timestamp,
      protocolNumber: point.sample,
      odValue: point.value,
      lotNumber,
      controlCode,
      runNumber: String(index + 1).padStart(2, '0'),
      vialNumber: `V${String(index + 1).padStart(2, '0')}`,
      performedBy: performer.displayName,
      performedById: performer.id,
      validatedBy: validator.displayName,
      validatedById: validator.id,
      flag: null,
      notes: null,
      editedAt: null,
      editReason: null,
      signedBy: null,
      signedAt: null,
    };
  });
}

const CORRECTIVE_ROOT_CAUSES: CorrectiveRootCause[] = [
  'reagent_issue',
  'instrument_malfunction',
  'operator_error',
  'sample_issue',
  'environmental_factor',
  'unexplained',
  'other',
];

const CORRECTIVE_NARRATIVES: Record<CorrectiveRootCause, { action: string; preventive: string }> = {
  reagent_issue: {
    action: 'Reagent lot inspected and conjugate replaced with a freshly reconstituted vial.',
    preventive: 'Reconstitution dates now recorded on the bench worksheet at first use.',
  },
  instrument_malfunction: {
    action: 'Plate reader lamp output verified and the optical path cleaned before the repeat run.',
    preventive: 'Reader diagnostics added to the start-of-week maintenance checklist.',
  },
  operator_error: {
    action: 'Pipetting sequence reviewed with the analyst and the affected wells re-run.',
    preventive: 'Second analyst now witnesses control plating during onboarding.',
  },
  sample_issue: {
    action: 'Control aliquot discarded after evidence of a partial freeze-thaw cycle.',
    preventive: 'Aliquots split into single-use volumes to avoid repeat thawing.',
  },
  environmental_factor: {
    action: 'Incubator temperature logged out of range and the run repeated once stable.',
    preventive: 'Continuous temperature logging enabled with an out-of-range alarm.',
  },
  unexplained: {
    action: 'Repeat run fell within limits; no assignable cause identified on review.',
    preventive: 'Stream flagged for closer supervisor review over the next ten runs.',
  },
  other: {
    action: 'Run reviewed with the supervisor and documented against the QC deviation log.',
    preventive: 'Deviation log entry scheduled for review at the monthly QC meeting.',
  },
};

/** FNV-1a, so seeded acknowledgement and root cause are stable across machines. */
function hashSeedText(value: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

/**
 * Derives the violations the seeded runs genuinely trip.
 *
 * These are evaluated with the same engine the app uses at runtime rather than
 * hand-written, so a seeded violation can never describe something the chart does
 * not show. Roughly a quarter are left open on purpose: the violation inbox and
 * its badge are empty otherwise, and an empty inbox reads as a broken page.
 */
export function buildSeedViolations(
  disease: DiseaseSlug,
  controlType: ControlTypeSlug,
  entries: QCEntry[],
): ViolationEntry[] {
  const monitorSeed = getControlMonitorSeed(disease, controlType);
  const chartData = entriesToChartData(entries);
  const statistics = calculateStatistics(chartData);
  const rules = evaluateQCRules(chartData, statistics, monitorSeed.parameters);
  const streamKey = `${disease}:${controlType}`;

  return rules.flatMap((rule) => {
    if (!rule.violated) {
      return [];
    }

    const triggeringEntries = (rule.triggeringIndices ?? [])
      .map((index) => entries[index])
      .filter((entry): entry is QCEntry => entry !== undefined);

    if (triggeringEntries.length === 0) {
      return [];
    }

    const lastEntry = triggeringEntries[triggeringEntries.length - 1];
    const seed = hashSeedText(`${streamKey}:${rule.name}`);
    const isOpen = seed % 4 === 0;
    const rootCause = CORRECTIVE_ROOT_CAUSES[seed % CORRECTIVE_ROOT_CAUSES.length];
    const narrative = CORRECTIVE_NARRATIVES[rootCause];
    const reviewer = pickSeedPerformer(streamKey, seed % 7);
    // Reviewed the morning after the run that tripped the rule.
    const acknowledgedAt = `${lastEntry.date}T${String(9 + (seed % 6)).padStart(2, '0')}:15:00.000Z`;
    const repeatTestPerformed = seed % 3 !== 0;

    const correctiveAction: CorrectiveAction = {
      rootCause,
      rootCauseDetails: null,
      actionTaken: narrative.action,
      preventiveAction: narrative.preventive,
      repeatTestPerformed,
      repeatODValue: repeatTestPerformed
        ? Number((statistics.mean + statistics.sd * 0.35).toFixed(4))
        : null,
      repeatProtocolNumber: repeatTestPerformed ? `${lastEntry.protocolNumber}-R` : null,
      outcome: seed % 9 === 0 ? 'escalated' : 'resolved',
      acknowledgedBy: reviewer.displayName,
      acknowledgedAt,
    };

    const violation: ViolationEntry = {
      id: crypto.randomUUID(),
      timestamp: `${lastEntry.date}T${String(7 + (seed % 4)).padStart(2, '0')}:40:00.000Z`,
      ruleName: rule.name,
      // Only `1_2s`, `10x`, and `7T` are warnings; anything else halts reporting.
      severity: rule.severity ?? 'rejection',
      triggeringProtocols: triggeringEntries.map((entry) => entry.protocolNumber),
      triggeringODValues: triggeringEntries.map((entry) => entry.odValue),
      lotNumber: lastEntry.lotNumber,
      acknowledged: !isOpen,
      acknowledgedBy: isOpen ? null : reviewer.displayName,
      acknowledgedAt: isOpen ? null : acknowledgedAt,
      correctiveAction: isOpen ? null : correctiveAction,
    };

    return [violation];
  });
}

export function buildSeedLots(disease: DiseaseSlug, controlType: ControlTypeSlug): LotMetadata[] {
  if (controlType === 'in-house-control') {
    return [];
  }

  const monitorSeed = getControlMonitorSeed(disease, controlType);
  const priorSeed = getPriorLotSeed(disease, controlType);

  // Oldest first, so anything ordering by index matches ordering by date.
  const priorLots: LotMetadata[] =
    priorSeed === null
      ? []
      : [
          {
            lotNumber: priorSeed.lotNumber,
            startDate: priorSeed.startDate,
            endDate: priorSeed.endDate,
            expiryDate: priorSeed.expiryDate,
            status: 'archived',
            notes: 'Retired reagent lot, kept for lot-to-lot comparison',
          },
        ];

  return [
    ...priorLots,
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
  const monitorSeed = getControlMonitorSeed(disease, controlType);
  const seedEntries = buildSeedEntries(disease, controlType);

  if (controlType === 'in-house-control') {
    await initializeEntries(disease, controlType, seedEntries, DEFAULT_IN_HOUSE_LOT_NUMBER, monitorSeed.seedVersion);
    await seedViolations(disease, controlType, seedEntries);

    // The batch the lab made before the current one. Without it the in-house
    // monitor is the only stream with nothing to compare a changeover against.
    const priorBatchSeed = getPriorLotSeed(disease, controlType);
    const priorBatchEntries = buildSeedPriorEntries(disease, controlType);

    if (priorBatchSeed !== null && priorBatchEntries.length > 0) {
      await initializeInHouseBatches(
        disease,
        [
          {
            batchId: priorBatchSeed.lotNumber,
            startDate: priorBatchSeed.startDate,
            endDate: priorBatchSeed.endDate,
            status: 'archived',
            notes: 'Retired in-house batch, kept for batch-to-batch comparison',
          },
        ],
        monitorSeed.seedVersion,
      );
      await initializeEntries(
        disease,
        controlType,
        priorBatchEntries,
        priorBatchSeed.lotNumber,
        monitorSeed.seedVersion,
      );
      await seedViolations(disease, controlType, priorBatchEntries, priorBatchSeed.lotNumber);
    }

    return;
  }

  const seedLots = buildSeedLots(disease, controlType);
  // Named explicitly rather than taken from seedLots[0]: the prior lot is
  // prepended so the list reads oldest-first, and index 0 is no longer active.
  const activeLotNumber = getSeedLotNumber(disease, controlType);
  const priorSeed = getPriorLotSeed(disease, controlType);
  const priorEntries = buildSeedPriorEntries(disease, controlType);

  await initializeLots(disease, controlType, seedLots, monitorSeed.seedVersion);

  if (priorSeed !== null && priorEntries.length > 0) {
    await initializeEntries(
      disease,
      controlType,
      priorEntries,
      priorSeed.lotNumber,
      monitorSeed.seedVersion,
    );
    await seedViolations(disease, controlType, priorEntries, priorSeed.lotNumber);
  }

  await initializeEntries(disease, controlType, seedEntries, activeLotNumber, monitorSeed.seedVersion);
  await seedViolations(disease, controlType, seedEntries, activeLotNumber);
}

/**
 * Writes the seeded violations for a stream.
 *
 * Runs after `initializeEntries` because bumping a seed version clears the stream's
 * violation log. `addViolation` de-duplicates on rule plus triggering protocols, so
 * repeated calls are harmless and a violation the user has already acknowledged is
 * never resurrected in its unacknowledged form.
 */
async function seedViolations(
  disease: DiseaseSlug,
  controlType: ControlTypeSlug,
  seedEntries: QCEntry[],
  lotNumber?: string,
): Promise<void> {
  for (const violation of buildSeedViolations(disease, controlType, seedEntries)) {
    await addViolation(disease, controlType, violation, lotNumber);
  }
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
