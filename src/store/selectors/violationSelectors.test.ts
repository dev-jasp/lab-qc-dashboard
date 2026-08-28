import { describe, expect, it } from 'vitest';

import {
  selectFilteredViolations,
  selectOpenRejectionCount,
  selectOpenViolations,
  selectRootCauseTally,
} from './violationSelectors';
import type { ViolationFiltersState } from '@/store/slices/violationFiltersSlice';
import type { CorrectiveAction, ViolationEntry, WestgardRule } from '@/types/qc.types';

function correctiveAction(rootCause: CorrectiveAction['rootCause']): CorrectiveAction {
  return {
    rootCause,
    rootCauseDetails: null,
    actionTaken: 'Repeat run performed.',
    preventiveAction: null,
    repeatTestPerformed: false,
    repeatODValue: null,
    repeatProtocolNumber: null,
    outcome: 'resolved',
    acknowledgedBy: 'Lab Supervisor',
    acknowledgedAt: '2026-02-02T09:15:00.000Z',
  };
}

function violation(
  id: string,
  ruleName: WestgardRule,
  severity: ViolationEntry['severity'],
  acknowledged: boolean,
  rootCause?: CorrectiveAction['rootCause'],
): ViolationEntry {
  return {
    id,
    timestamp: '2026-02-01T07:40:00.000Z',
    ruleName,
    severity,
    triggeringProtocols: [`${id}-P`],
    triggeringODValues: [1.234],
    lotNumber: 'E240423AS',
    acknowledged,
    acknowledgedBy: acknowledged ? 'Lab Supervisor' : null,
    acknowledgedAt: acknowledged ? '2026-02-02T09:15:00.000Z' : null,
    correctiveAction: rootCause === undefined ? null : correctiveAction(rootCause),
  };
}

const VIOLATIONS: ViolationEntry[] = [
  violation('a', '1_3s', 'rejection', false),
  violation('b', 'R_4s', 'rejection', true, 'reagent_issue'),
  violation('c', '1_2s', 'warning', false),
  violation('d', '10x', 'warning', true, 'reagent_issue'),
  violation('e', '2_2s', 'rejection', true, 'operator_error'),
];

const filters = (overrides: Partial<ViolationFiltersState> = {}): ViolationFiltersState => ({
  view: 'all',
  disease: 'all',
  severity: 'all',
  rule: 'all',
  ...overrides,
});

describe('selectOpenRejectionCount', () => {
  it('counts only unacknowledged rejections', () => {
    // The badge deliberately ignores warnings: counting them would leave it
    // permanently non-zero, and a badge that never clears gets ignored.
    expect(selectOpenRejectionCount(VIOLATIONS)).toBe(1);
  });

  it('treats an unloaded cache as zero rather than throwing', () => {
    expect(selectOpenRejectionCount(undefined)).toBe(0);
  });

  it('returns the same reference for the same input', () => {
    // Memoisation matters here: the sidebar and header both subscribe.
    const first = selectOpenRejectionCount(VIOLATIONS);
    const second = selectOpenRejectionCount(VIOLATIONS);

    expect(first).toBe(second);
  });
});

describe('selectOpenViolations', () => {
  it('keeps every unacknowledged item regardless of severity', () => {
    expect(selectOpenViolations(VIOLATIONS).map((item) => item.id)).toEqual(['a', 'c']);
  });
});

describe('selectFilteredViolations', () => {
  it('returns everything when nothing is filtered', () => {
    expect(selectFilteredViolations(VIOLATIONS, filters())).toHaveLength(5);
  });

  it('hides acknowledged items in the open view', () => {
    const result = selectFilteredViolations(VIOLATIONS, filters({ view: 'open' }));

    expect(result.map((item) => item.id)).toEqual(['a', 'c']);
  });

  it('filters by severity', () => {
    const result = selectFilteredViolations(VIOLATIONS, filters({ severity: 'rejection' }));

    expect(result.map((item) => item.id)).toEqual(['a', 'b', 'e']);
  });

  it('filters by rule', () => {
    const result = selectFilteredViolations(VIOLATIONS, filters({ rule: '10x' }));

    expect(result.map((item) => item.id)).toEqual(['d']);
  });

  it('applies view and severity together', () => {
    const result = selectFilteredViolations(
      VIOLATIONS,
      filters({ view: 'open', severity: 'rejection' }),
    );

    expect(result.map((item) => item.id)).toEqual(['a']);
  });
});

describe('selectRootCauseTally', () => {
  it('ranks root causes by frequency for the Pareto chart', () => {
    // A Pareto is only readable if the bars are already ordered.
    expect(selectRootCauseTally(VIOLATIONS)).toEqual([
      { rootCause: 'reagent_issue', count: 2 },
      { rootCause: 'operator_error', count: 1 },
    ]);
  });

  it('ignores violations that have no corrective action yet', () => {
    const openOnly = VIOLATIONS.filter((item) => !item.acknowledged);

    expect(selectRootCauseTally(openOnly)).toEqual([]);
  });
});
