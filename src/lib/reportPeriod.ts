import { format, parseISO } from 'date-fns';

/** Inclusive ISO (`YYYY-MM-DD`) bounds of the runs a report covers. */
export type ReportPeriod = {
  startDate: string;
  endDate: string;
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Narrows a mixed bag of stored date strings to well-formed `YYYY-MM-DD`.
 * Entry dates are written as plain ISO dates at the input edge, but seeded and
 * workbook-imported rows can carry a full timestamp, so the leading date is
 * kept and anything unparseable is dropped rather than skewing the bounds.
 */
function toIsoDates(dates: string[]): string[] {
  return dates
    .map((value) => value.trim().slice(0, 10))
    .filter((value) => ISO_DATE_PATTERN.test(value));
}

/**
 * Earliest and latest run date across the supplied dates, or `null` when there
 * is nothing to cover. ISO dates are compared as strings, per the date handling
 * convention in AGENTS.md.
 */
export function getReportPeriod(dates: string[]): ReportPeriod | null {
  const isoDates = toIsoDates(dates);
  const [firstDate] = isoDates;

  if (firstDate === undefined) {
    return null;
  }

  return isoDates.reduce<ReportPeriod>(
    (period, value) => ({
      startDate: value < period.startDate ? value : period.startDate,
      endDate: value > period.endDate ? value : period.endDate,
    }),
    { startDate: firstDate, endDate: firstDate },
  );
}

function formatPeriodDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), 'MMM dd, yyyy');
  } catch {
    return isoDate;
  }
}

/**
 * `Jan 14, 2026 - Nov 02, 2026`, collapsing to a single date when every run
 * landed on the same day. Returns an empty string for an empty period so the
 * printable can omit the line instead of printing an empty range.
 */
export function formatReportPeriod(period: ReportPeriod | null): string {
  if (period === null) {
    return '';
  }

  const startLabel = formatPeriodDate(period.startDate);

  if (period.startDate === period.endDate) {
    return startLabel;
  }

  return `${startLabel} – ${formatPeriodDate(period.endDate)}`;
}

/**
 * The year a report is filed under: the year of its latest run, not the year
 * the operator happened to press print. A lot whose runs ended in 2026 stays a
 * 2026 chart when it is reprinted in 2027.
 *
 * The wall clock is used only as a last resort, for a stream with no runs at
 * all, where there is no run date to file it under.
 */
export function getReportYear(
  dates: string[],
  fallbackYear: number = new Date().getFullYear(),
): number {
  const period = getReportPeriod(dates);

  if (period === null) {
    return fallbackYear;
  }

  return Number(period.endDate.slice(0, 4));
}
