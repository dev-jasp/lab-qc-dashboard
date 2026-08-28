import { differenceInCalendarDays, parseISO } from 'date-fns';

import { CONTROL_DEFINITIONS, DISEASE_DEFINITIONS } from '@/constants/monitor-config';
import { buildExportCatalog, type ExportStream } from '@/lib/exportCatalog';
import type { ControlTypeSlug, DiseaseSlug } from '@/types/qc.types';

export type ExpiryState =
  | { kind: 'none' }
  | { kind: 'ok'; daysRemaining: number }
  | { kind: 'warning'; daysRemaining: number }
  | { kind: 'expired'; daysOverdue: number };

export type LotShift = {
  previousId: string;
  meanDeltaPercent: number;
  /**
   * The mean shift measured in the previous lot's own SDs, signed.
   *
   * This is the number a supervisor actually signs a changeover against — a
   * percentage means nothing without knowing how tightly that lot ran. It is
   * also what `tone` is derived from, so exposing it lets the UI show the
   * evidence rather than just the verdict.
   */
  meanDeltaSD: number;
  cvDelta: number;
  tone: 'neutral' | 'warning' | 'critical';
};

/** A lot or batch, plus the derived state the lot console needs. */
export type LotRecord = ExportStream & {
  expiry: ExpiryState;
  shift: LotShift | null;
};

export type MissingLot = {
  disease: DiseaseSlug;
  diseaseName: string;
  controlType: ControlTypeSlug;
  controlLabel: string;
  controlShortLabel: string;
};

export type AttentionItem =
  | { kind: 'expired'; record: LotRecord }
  | { kind: 'expiring'; record: LotRecord }
  | { kind: 'no-active-lot'; missing: MissingLot };

export type LotRegistry = {
  records: LotRecord[];
  active: LotRecord[];
  archived: LotRecord[];
  attention: AttentionItem[];
};

/** Matches the getTodayIsoDate convention used across qcStorage and qcMonitor. */
function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function computeExpiry(
  expiryDate: string | null,
  today: string,
  warningDays: number,
): ExpiryState {
  // In-house batches carry no expiry, and older lots may have been seeded with null.
  if (expiryDate === null || expiryDate === '') {
    return { kind: 'none' };
  }

  const days = differenceInCalendarDays(parseISO(expiryDate), parseISO(today));

  if (days < 0) {
    return { kind: 'expired', daysOverdue: Math.abs(days) };
  }

  if (days <= warningDays) {
    return { kind: 'warning', daysRemaining: days };
  }

  return { kind: 'ok', daysRemaining: days };
}

/**
 * Compares a lot against the one it replaced on the same control stream.
 *
 * The previous lot's SD is the yardstick: a changeover that moves the mean by
 * more than 2 SD of the old lot's own spread is worth a supervisor's attention.
 * Returns null when either side is too small to have a meaningful SD.
 */
/** One side of a changeover, reduced to the numbers the grade depends on. */
export type ShiftSide = {
  id: string;
  mean: number;
  sd: number;
  cv: number;
  runCount: number;
};

/**
 * Grades one changeover against the lot it replaced.
 *
 * This is the clinical rule, and it lives in exactly one place on purpose. The
 * lot console and the control monitor both present it, and two copies of a
 * threshold is how a QC app ends up telling a supervisor two different things
 * about the same pair of lots.
 *
 * Returns null when either side is too small to have a meaningful SD.
 */
export function gradeShift(current: ShiftSide, previous: ShiftSide): LotShift | null {
  if (current.runCount < 2 || previous.runCount < 2) {
    return null;
  }

  if (previous.mean === 0 || previous.sd === 0) {
    return null;
  }

  const meanDelta = current.mean - previous.mean;
  const meanDeltaSD = meanDelta / previous.sd;
  const shiftInSDs = Math.abs(meanDeltaSD);

  return {
    previousId: previous.id,
    meanDeltaPercent: (meanDelta / previous.mean) * 100,
    meanDeltaSD,
    cvDelta: current.cv - previous.cv,
    tone: shiftInSDs > 2 ? 'critical' : shiftInSDs > 1 ? 'warning' : 'neutral',
  };
}

const toShiftSide = (stream: ExportStream): ShiftSide => ({
  id: stream.partitionId,
  mean: stream.statistics.mean,
  sd: stream.statistics.sd,
  cv: stream.cv,
  runCount: stream.runCount,
});

function computeShift(record: ExportStream, streamsForControl: ExportStream[]): LotShift | null {
  const previous = streamsForControl
    .filter(
      (candidate) =>
        candidate.partitionId !== record.partitionId && candidate.startDate <= record.startDate,
    )
    .sort((first, second) => first.startDate.localeCompare(second.startDate))
    .at(-1);

  if (previous === undefined) {
    return null;
  }

  return gradeShift(toShiftSide(record), toShiftSide(previous));
}

function buildControlKey(disease: string, controlType: string): string {
  return `${disease}:${controlType}`;
}

function buildAttention(active: LotRecord[]): AttentionItem[] {
  const expired: AttentionItem[] = [];
  const expiring: AttentionItem[] = [];

  active.forEach((record) => {
    if (record.expiry.kind === 'expired') {
      expired.push({ kind: 'expired', record });
    } else if (record.expiry.kind === 'warning') {
      expiring.push({ kind: 'expiring', record });
    }
  });

  // Nothing enforces exactly one active lot per control, and archiving the last
  // one is now reachable from the UI — so a control with no active lot is a real
  // state that has to surface rather than silently disappear.
  const activeControlKeys = new Set(
    active.map((record) => buildControlKey(record.disease, record.controlType)),
  );

  const missing: AttentionItem[] = [];

  DISEASE_DEFINITIONS.forEach((disease) => {
    CONTROL_DEFINITIONS.forEach((control) => {
      if (activeControlKeys.has(buildControlKey(disease.slug, control.slug))) {
        return;
      }

      missing.push({
        kind: 'no-active-lot',
        missing: {
          disease: disease.slug,
          diseaseName: disease.name,
          controlType: control.slug,
          controlLabel: control.label,
          controlShortLabel: control.shortLabel,
        },
      });
    });
  });

  const byUrgency = (first: AttentionItem, second: AttentionItem) => {
    const firstDays = first.kind === 'expiring' ? first.record.expiry : null;
    const secondDays = second.kind === 'expiring' ? second.record.expiry : null;
    const firstValue = firstDays !== null && firstDays.kind === 'warning' ? firstDays.daysRemaining : 0;
    const secondValue =
      secondDays !== null && secondDays.kind === 'warning' ? secondDays.daysRemaining : 0;

    return firstValue - secondValue;
  };

  return [...expired, ...expiring.sort(byUrgency), ...missing];
}

/**
 * Reads every lot and in-house batch and derives expiry state, lot-to-lot shift
 * and the attention list.
 *
 * Built on buildExportCatalog so the partition traversal and statistics live in
 * one place rather than being duplicated per page.
 */
export async function buildLotRegistry(warningDays: number): Promise<LotRegistry> {
  const groups = await buildExportCatalog();
  const streams = groups.flatMap((group) => group.streams);

  const streamsByControl = new Map<string, ExportStream[]>();

  streams.forEach((stream) => {
    const key = buildControlKey(stream.disease, stream.controlType);
    const existing = streamsByControl.get(key);

    if (existing === undefined) {
      streamsByControl.set(key, [stream]);
    } else {
      existing.push(stream);
    }
  });

  const today = getTodayIsoDate();

  const records: LotRecord[] = streams.map((stream) => ({
    ...stream,
    expiry: computeExpiry(stream.expiryDate, today, warningDays),
    shift: computeShift(
      stream,
      streamsByControl.get(buildControlKey(stream.disease, stream.controlType)) ?? [],
    ),
  }));

  const active = records.filter((record) => record.partitionStatus === 'active');
  const archived = records.filter((record) => record.partitionStatus === 'archived');

  return {
    records,
    active,
    archived,
    attention: buildAttention(active),
  };
}
