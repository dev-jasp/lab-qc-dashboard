import { buildExportCatalog } from '@/lib/exportCatalog';
import { getStaff } from '@/lib/qcStorage';
import type {
  ControlTypeSlug,
  DiseaseSlug,
  DutyShift,
  QCEntry,
  StaffMember,
  StaffRole,
  Weekday,
} from '@/types/qc.types';

export const ROLE_LABELS: Record<StaffRole, string> = {
  analyst: 'Analyst',
  supervisor: 'Supervisor',
  admin: 'Admin',
};

export const SHIFT_LABELS: Record<DutyShift, string> = {
  morning: 'Morning',
  mid: 'Mid',
  night: 'Night',
  rotating: 'Rotating',
};

/** Indicative hours, shown as a hint. The roster stores the shift, not times. */
export const SHIFT_HOURS: Record<DutyShift, string> = {
  morning: '6:00 AM – 2:00 PM',
  mid: '2:00 PM – 10:00 PM',
  night: '10:00 PM – 6:00 AM',
  rotating: 'Varies by week',
};

export const WEEKDAY_ORDER: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

export function sortWeekdays(days: Weekday[]): Weekday[] {
  return WEEKDAY_ORDER.filter((day) => days.includes(day));
}

/**
 * Renders duty days the way a roster is read rather than as a raw list:
 * consecutive runs of three or more collapse to a range, so Mon/Tue/Wed/Thu/Fri
 * becomes "Mon–Fri" while Wed/Fri/Sat stays "Wed, Fri, Sat".
 *
 * Runs are computed over WEEKDAY_ORDER, so the week does not wrap — a Sun+Mon
 * pairing reads as two entries, which is how a Mon-start roster is posted.
 */
export function formatDutyDays(days: Weekday[]): string {
  const ordered = sortWeekdays(days);

  if (ordered.length === 0) {
    return 'No fixed days';
  }

  const runs: Weekday[][] = [];

  ordered.forEach((day) => {
    const currentRun = runs[runs.length - 1];
    const previousDay = currentRun?.[currentRun.length - 1];

    if (
      currentRun !== undefined &&
      previousDay !== undefined &&
      WEEKDAY_ORDER.indexOf(day) === WEEKDAY_ORDER.indexOf(previousDay) + 1
    ) {
      currentRun.push(day);
      return;
    }

    runs.push([day]);
  });

  return runs
    .map((run) =>
      run.length >= 3
        ? `${WEEKDAY_LABELS[run[0]]}–${WEEKDAY_LABELS[run[run.length - 1]]}`
        : run.map((day) => WEEKDAY_LABELS[day]).join(', '),
    )
    .join(', ');
}

/** One control stream a person has recorded runs against. */
export type StaffStreamActivity = {
  disease: DiseaseSlug;
  diseaseName: string;
  controlType: ControlTypeSlug;
  controlLabel: string;
  controlShortLabel: string;
  partitionId: string;
  runCount: number;
  lastRunDate: string | null;
};

export type StaffRunEntry = {
  entry: QCEntry;
  disease: DiseaseSlug;
  diseaseName: string;
  controlType: ControlTypeSlug;
  controlShortLabel: string;
  partitionId: string;
};

export type StaffActivity = {
  runCount: number;
  lastRunDate: string | null;
  streams: StaffStreamActivity[];
  recentRuns: StaffRunEntry[];
};

export type StaffRecord = StaffMember & { activity: StaffActivity };

const RECENT_RUN_LIMIT = 25;

const EMPTY_ACTIVITY: StaffActivity = {
  runCount: 0,
  lastRunDate: null,
  streams: [],
  recentRuns: [],
};

export function deriveInitials(displayName: string): string {
  const words = splitNameWords(displayName);

  if (words.length === 0) {
    return '';
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

/**
 * Renders a roster name the way the bench writes it: first initial, surname.
 * "Rosario Delfin" becomes "R. Delfin".
 *
 * Derived rather than stored, because every name on this roster is a given
 * name followed by a surname. A roster carrying suffixes ("Juan Cruz Jr.") or
 * multi-word surnames ("Ana de la Cruz") would need a stored override — the
 * last word stops being the surname and no rule recovers it.
 */
export function formatBenchName(displayName: string): string {
  const words = splitNameWords(displayName);

  if (words.length === 0) {
    return '';
  }

  if (words.length === 1) {
    return words[0];
  }

  return `${words[0][0].toUpperCase()}. ${words[words.length - 1]}`;
}

/**
 * Finds the roster member a worksheet's bench name refers to.
 *
 * Worksheets write "A.REYES"; the roster stores "Alina Reyes". Both collapse
 * to the same letters-only key, which is the whole comparison — punctuation,
 * spacing and case all vary between files and none of them carry meaning.
 *
 * Returns null unless exactly one member matches. Two people sharing an
 * initial and a surname is not something to resolve by guessing, and the
 * caller is expected to leave the picker empty rather than pick for the
 * operator.
 */
export function findStaffByBenchName(
  staff: StaffMember[],
  benchName: string,
): StaffMember | null {
  const target = benchNameKey(benchName);

  if (target === '') {
    return null;
  }

  const matches = staff.filter(
    (member) => benchNameKey(formatBenchName(member.displayName)) === target,
  );

  return matches.length === 1 ? matches[0] : null;
}

function benchNameKey(value: string): string {
  return value.replace(/[^a-z]/gi, '').toUpperCase();
}

function splitNameWords(displayName: string): string[] {
  return displayName
    .split(/[\s.]+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0);
}

/**
 * Reads the roster and attributes every recorded run to its staff member.
 *
 * Built on buildExportCatalog so the partition traversal lives in one place.
 * Grouping is strictly by `performedById` — legacy entries carrying only a
 * free-text `performedBy` are left unattributed rather than matched by name,
 * since that guesswork is exactly what this module removes.
 */
export async function buildStaffDirectory(): Promise<StaffRecord[]> {
  const [staff, groups] = await Promise.all([getStaff(), buildExportCatalog()]);

  const activityById = new Map<string, StaffActivity>();

  const ensureActivity = (staffMemberId: string): StaffActivity => {
    const existing = activityById.get(staffMemberId);

    if (existing !== undefined) {
      return existing;
    }

    const created: StaffActivity = { runCount: 0, lastRunDate: null, streams: [], recentRuns: [] };
    activityById.set(staffMemberId, created);
    return created;
  };

  groups.forEach((group) => {
    group.streams.forEach((stream) => {
      // Per stream, tally each person once rather than pushing a stream row per entry.
      const streamTallies = new Map<string, { runCount: number; lastRunDate: string | null }>();

      stream.entries.forEach((entry) => {
        if (entry.performedById === null || entry.performedById === '') {
          return;
        }

        const activity = ensureActivity(entry.performedById);
        activity.runCount += 1;

        if (activity.lastRunDate === null || entry.date.localeCompare(activity.lastRunDate) > 0) {
          activity.lastRunDate = entry.date;
        }

        activity.recentRuns.push({
          entry,
          disease: stream.disease,
          diseaseName: stream.diseaseName,
          controlType: stream.controlType,
          controlShortLabel: stream.controlShortLabel,
          partitionId: stream.partitionId,
        });

        const tally = streamTallies.get(entry.performedById);

        if (tally === undefined) {
          streamTallies.set(entry.performedById, { runCount: 1, lastRunDate: entry.date });
          return;
        }

        tally.runCount += 1;

        if (tally.lastRunDate === null || entry.date.localeCompare(tally.lastRunDate) > 0) {
          tally.lastRunDate = entry.date;
        }
      });

      streamTallies.forEach((tally, staffMemberId) => {
        ensureActivity(staffMemberId).streams.push({
          disease: stream.disease,
          diseaseName: stream.diseaseName,
          controlType: stream.controlType,
          controlLabel: stream.controlLabel,
          controlShortLabel: stream.controlShortLabel,
          partitionId: stream.partitionId,
          runCount: tally.runCount,
          lastRunDate: tally.lastRunDate,
        });
      });
    });
  });

  return staff.map((member) => {
    const activity = activityById.get(member.id);

    if (activity === undefined) {
      return { ...member, activity: EMPTY_ACTIVITY };
    }

    return {
      ...member,
      activity: {
        ...activity,
        streams: [...activity.streams].sort((first, second) => second.runCount - first.runCount),
        recentRuns: [...activity.recentRuns]
          .sort((first, second) => second.entry.date.localeCompare(first.entry.date))
          .slice(0, RECENT_RUN_LIMIT),
      },
    };
  });
}

export function countActiveStaff(records: StaffRecord[]): number {
  return records.filter((record) => record.isActive).length;
}
