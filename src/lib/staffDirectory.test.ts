import { describe, expect, it } from 'vitest';

import type { StaffMember } from '@/types/qc.types';

import {
  deriveInitials,
  findStaffByBenchName,
  formatBenchName,
  formatDutyDays,
  sortWeekdays,
} from './staffDirectory';

function staffMember(id: string, displayName: string): StaffMember {
  return {
    id,
    staffId: id.toUpperCase(),
    displayName,
    initials: deriveInitials(displayName),
    role: 'analyst',
    contactNumber: null,
    email: null,
    photoUrl: null,
    shift: 'morning',
    dutyDays: [],
    isActive: true,
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
  };
}

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

describe('formatBenchName', () => {
  it('renders first initial and surname, the way the bench writes it', () => {
    expect(formatBenchName('Rosario Delfin')).toBe('R. Delfin');
    expect(formatBenchName('Alina Reyes')).toBe('A. Reyes');
  });

  it('keeps the surname of a three-part name', () => {
    expect(formatBenchName('Maria Elena Bautista')).toBe('M. Bautista');
  });

  it('leaves a single name alone rather than abbreviating it to nothing', () => {
    expect(formatBenchName('Rosario')).toBe('Rosario');
  });

  it('returns an empty string when there is no name to work from', () => {
    expect(formatBenchName('   ')).toBe('');
  });
});

describe('findStaffByBenchName', () => {
  const roster = [
    staffMember('reyes', 'Alina Reyes'),
    staffMember('puti', 'Mina Puti'),
    staffMember('bautista', 'Maria Elena Bautista'),
  ];

  it('matches a worksheet name against the roster despite punctuation and case', () => {
    // Worksheets write "A.REYES"; the roster stores "Alina Reyes".
    expect(findStaffByBenchName(roster, 'A.REYES')?.id).toBe('reyes');
    expect(findStaffByBenchName(roster, 'M.PUTI')?.id).toBe('puti');
    expect(findStaffByBenchName(roster, 'a. reyes')?.id).toBe('reyes');
  });

  it('matches on the surname of a three-part name', () => {
    expect(findStaffByBenchName(roster, 'M.BAUTISTA')?.id).toBe('bautista');
  });

  it('returns null rather than guessing when two people would match', () => {
    const ambiguous = [...roster, staffMember('reyes-2', 'Arnel Reyes')];

    expect(findStaffByBenchName(ambiguous, 'A.REYES')).toBeNull();
  });

  it('returns null for a name nobody on the roster carries', () => {
    expect(findStaffByBenchName(roster, 'J.SANTOS')).toBeNull();
    expect(findStaffByBenchName(roster, '')).toBeNull();
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
