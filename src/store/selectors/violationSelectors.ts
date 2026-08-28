import { createSelector } from '@reduxjs/toolkit';

import type { ViolationFiltersState } from '@/store/slices/violationFiltersSlice';
import type { ViolationEntry } from '@/types/qc.types';

const EMPTY_VIOLATIONS: ViolationEntry[] = [];

/**
 * A violation still awaiting a supervisor.
 *
 * `AppSidebar` and `DashboardHeader` each carried their own copy of this predicate.
 * Two copies of one rule is how the sidebar and the header end up disagreeing about
 * how many items are outstanding, so it lives here now and both read the same
 * answer.
 */
const isOpenRejection = (violation: ViolationEntry): boolean =>
  !violation.acknowledged && violation.severity === 'rejection';

/**
 * The count behind the navigation badge.
 *
 * Only unacknowledged *rejections* count. Warnings are advisory and a badge that
 * counted them would never reach zero, which trains people to ignore it.
 */
export const selectOpenRejectionCount = createSelector(
  [(violations: ViolationEntry[] | undefined) => violations ?? EMPTY_VIOLATIONS],
  (violations) => violations.filter(isOpenRejection).length,
);

export const selectOpenViolations = createSelector(
  [(violations: ViolationEntry[] | undefined) => violations ?? EMPTY_VIOLATIONS],
  (violations) => violations.filter((violation) => !violation.acknowledged),
);

/**
 * Applies the inbox filters to a violation list.
 *
 * Memoised because the violation table re-renders on every filter keystroke and on
 * every cache refresh; without this the whole list is rebuilt each time.
 */
export const selectFilteredViolations = createSelector(
  [
    (violations: ViolationEntry[] | undefined) => violations ?? EMPTY_VIOLATIONS,
    (_violations: ViolationEntry[] | undefined, filters: ViolationFiltersState) => filters,
  ],
  (violations, filters) =>
    violations.filter((violation) => {
      if (filters.view === 'open' && violation.acknowledged) {
        return false;
      }

      if (filters.severity !== 'all' && violation.severity !== filters.severity) {
        return false;
      }

      if (filters.rule !== 'all' && violation.ruleName !== filters.rule) {
        return false;
      }

      return true;
    }),
);

/** Groups acknowledged violations by root cause, ordered for a Pareto chart. */
export const selectRootCauseTally = createSelector(
  [(violations: ViolationEntry[] | undefined) => violations ?? EMPTY_VIOLATIONS],
  (violations) => {
    const tally = new Map<string, number>();

    for (const violation of violations) {
      const rootCause = violation.correctiveAction?.rootCause;

      if (rootCause !== undefined) {
        tally.set(rootCause, (tally.get(rootCause) ?? 0) + 1);
      }
    }

    return [...tally.entries()]
      .map(([rootCause, count]) => ({ rootCause, count }))
      .sort((left, right) => right.count - left.count);
  },
);
