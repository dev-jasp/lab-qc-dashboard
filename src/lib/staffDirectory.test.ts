import { describe, expect, it } from 'vitest';

import { deriveInitials, formatDutyDays, sortWeekdays } from './staffDirectory';

describe('deriveInitials', () => {
  it('takes the first and last initial of a full name', () => {
    expect(deriveInitials('Maria Elena Bautista')).toBe('MB');
    expect(deriveInitials('Joel Andrada')).toBe('JA');
  });

  it('falls back to the first two letters of a single name', () => {
    expect(deriveInitials('Rosario')).toBe('RO');
  });

  it('splits on dots, so an abbreviated name still resolves', () => {
    expect(deriveInitials('J.Santos')).toBe('JS');
  });

  it('ignores surrounding and repeated whitespace', () => {
    expect(deriveInitials('  Grace   Villanueva  ')).toBe('GV');
  });

  it('returns an empty string when there is no name to work from', () => {
    expect(deriveInitials('')).toBe('');
    expect(deriveInitials('   ')).toBe('');
  });
});

describe('sortWeekdays', () => {
  it('orders days by the week, not by the order given', () => {
    expect(sortWeekdays(['fri', 'mon', 'wed'])).toEqual(['mon', 'wed', 'fri']);
  });

  it('drops duplicates, since a day is either worked or not', () => {
    expect(sortWeekdays(['mon', 'mon', 'tue'])).toEqual(['mon', 'tue']);
  });
});

describe('formatDutyDays', () => {
  it('collapses a run of three or more into a range', () => {
    expect(formatDutyDays(['mon', 'tue', 'wed', 'thu', 'fri'])).toBe('Mon–Fri');
    expect(formatDutyDays(['tue', 'wed', 'thu', 'fri', 'sat'])).toBe('Tue–Sat');
    expect(formatDutyDays(['mon', 'tue', 'wed'])).toBe('Mon–Wed');
  });

  it('lists a run of two rather than ranging it', () => {
    expect(formatDutyDays(['mon', 'tue'])).toBe('Mon, Tue');
  });

  it('lists non-consecutive days separately', () => {
    expect(formatDutyDays(['mon', 'wed'])).toBe('Mon, Wed');
  });

  it('mixes ranges and single days in one schedule', () => {
    expect(formatDutyDays(['mon', 'tue', 'wed', 'fri'])).toBe('Mon–Wed, Fri');
  });

  it('normalises order before formatting', () => {
    expect(formatDutyDays(['fri', 'mon', 'wed', 'tue'])).toBe('Mon–Wed, Fri');
  });

  it('does not wrap the week, so Sunday never joins a Monday run', () => {
    expect(formatDutyDays(['sun', 'mon', 'tue', 'wed'])).toBe('Mon–Wed, Sun');
  });

  it('describes an empty schedule rather than rendering nothing', () => {
    expect(formatDutyDays([])).toBe('No fixed days');
  });
});
