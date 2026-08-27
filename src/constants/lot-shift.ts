import type { LotShift } from '@/lib/lotRegistry';

/**
 * How a changeover of each grade reads to a supervisor.
 *
 * The thresholds themselves live in `gradeShift`; this is only their wording and
 * colour. Both the lot console and the control monitor read from here, so the
 * same pair of lots can never be described two different ways.
 *
 * Every verdict ships as words as well as colour — the status palette is
 * reserved for exactly this kind of state, and colour is never the only cue.
 */
export const SHIFT_VERDICT: Record<
  LotShift['tone'],
  { label: string; className: string }
> = {
  neutral: { label: 'Comparable', className: 'bg-[#dcfce7] text-[#16a34a]' },
  warning: { label: 'Review', className: 'bg-[#fef3c7] text-[#d97706]' },
  critical: { label: 'Verify before use', className: 'bg-[#fee2e2] text-[#dc2626]' },
};
