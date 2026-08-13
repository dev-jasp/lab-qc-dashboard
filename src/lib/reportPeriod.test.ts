import { describe, expect, it } from 'vitest';

import { formatReportPeriod, getReportPeriod, getReportYear } from './reportPeriod';

describe('getReportPeriod', () => {
  it('returns the earliest and latest date regardless of input order', () => {
    expect(getReportPeriod(['2026-06-02', '2026-01-14', '2026-11-02'])).toEqual({
      startDate: '2026-01-14',
      endDate: '2026-11-02',
    });
  });

  it('spans a year boundary', () => {
    expect(getReportPeriod(['2026-12-28', '2027-01-05'])).toEqual({
      startDate: '2026-12-28',
      endDate: '2027-01-05',
    });
  });

  it('collapses to a single day when every run landed on the same date', () => {
    expect(getReportPeriod(['2026-03-09', '2026-03-09'])).toEqual({
      startDate: '2026-03-09',
      endDate: '2026-03-09',
    });
  });

  it('takes the leading date from a full timestamp', () => {
    expect(getReportPeriod(['2026-04-21T08:30:00.000Z'])).toEqual({
      startDate: '2026-04-21',
      endDate: '2026-04-21',
    });
  });

  it('drops unparseable values rather than skewing the bounds', () => {
    expect(getReportPeriod(['', 'not-a-date', '2026-05-01'])).toEqual({
      startDate: '2026-05-01',
      endDate: '2026-05-01',
    });
  });

  it('returns null when there is nothing to cover', () => {
    expect(getReportPeriod([])).toBeNull();
    expect(getReportPeriod(['not-a-date'])).toBeNull();
  });
});

describe('formatReportPeriod', () => {
  it('formats a range', () => {
    expect(formatReportPeriod({ startDate: '2026-01-14', endDate: '2026-11-02' })).toBe(
      'Jan 14, 2026 – Nov 02, 2026',
    );
  });

  it('prints one date when the range covers a single day', () => {
    expect(formatReportPeriod({ startDate: '2026-03-09', endDate: '2026-03-09' })).toBe(
      'Mar 09, 2026',
    );
  });

  it('returns an empty string for an empty period', () => {
    expect(formatReportPeriod(null)).toBe('');
  });
});

describe('getReportYear', () => {
  it('files a report under the year of its latest run', () => {
    expect(getReportYear(['2026-01-14', '2026-11-02'])).toBe(2026);
  });

  it('does not follow the wall clock when the runs are from another year', () => {
    expect(getReportYear(['2026-11-02'], 2027)).toBe(2026);
  });

  it('files a run set that crosses new year under the later year', () => {
    expect(getReportYear(['2026-12-28', '2027-01-05'])).toBe(2027);
  });

  it('falls back to the supplied year when a stream has no runs', () => {
    expect(getReportYear([], 2027)).toBe(2027);
  });
});
