import { ChartLineUpIcon, WarningIcon } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

import { ViolationParetoChart } from '@/components/chart/ViolationParetoChart';
import { Badge } from '@/components/ui/badge';
import { CONTROL_DEFINITIONS, DISEASE_DEFINITIONS } from '@/constants/monitor-config';
import { useGetAllViolationsQuery } from '@/store/api/violationsEndpoints';
import {
  selectOpenRejectionCount,
  selectOpenViolations,
  selectRootCauseTally,
} from '@/store/selectors/violationSelectors';
import { CHART_INK } from '@/utils/chart-theme';
import type { ViolationEntry, WestgardRule } from '@/types/qc.types';

const RULE_ORDER: WestgardRule[] = ['1_3s', '2_2s', 'R_4s', '4_1s', '1_2s', '10x', '7T'];

/**
 * A headline number, not a chart.
 *
 * A single value has no shape to read, so plotting one adds ink without adding
 * information. These are the four numbers a supervisor checks first.
 */
function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: 'critical' | 'good';
}) {
  const valueColor =
    tone === 'critical' ? CHART_INK.critical : tone === 'good' ? CHART_INK.good : CHART_INK.primary;

  return (
    <div className="rounded-2xl border border-[#f0f0f0] bg-white p-5 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
        {label}
      </p>
      <p className="mt-3 text-[32px] font-bold leading-none tabular-nums" style={{ color: valueColor }}>
        {value}
      </p>
      <p className="mt-2 text-[12px] text-[#9ca3af]">{hint}</p>
    </div>
  );
}

function countByRule(violations: ViolationEntry[]): { rule: WestgardRule; count: number }[] {
  return RULE_ORDER.map((rule) => ({
    rule,
    count: violations.filter((violation) => violation.ruleName === rule).length,
  })).filter((entry) => entry.count > 0);
}

export function Analytics() {
  const { data: violations = [], isLoading } = useGetAllViolationsQuery();

  const openRejections = selectOpenRejectionCount(violations);
  const openViolations = selectOpenViolations(violations);
  const rootCauseTally = selectRootCauseTally(violations);
  const ruleCounts = countByRule(violations);

  const acknowledged = violations.length - openViolations.length;
  const acknowledgedRate =
    violations.length === 0 ? 0 : Math.round((acknowledged / violations.length) * 100);
  const streamCount = DISEASE_DEFINITIONS.length * CONTROL_DEFINITIONS.length;
  const maxRuleCount = ruleCounts.reduce((largest, entry) => Math.max(largest, entry.count), 0);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#f0f0f0] bg-white p-8 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
              Analytics
            </p>
            <h1 className="mt-3 text-3xl font-bold text-[#111827]">QC performance overview</h1>
            <p className="mt-3 max-w-3xl text-sm text-[#6b7280]">
              Rule activity and root causes across every disease and control stream.
              Drift and precision trends are on each control&apos;s own monitor, where
              they can be read against that stream&apos;s Levey-Jennings chart.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#eef2ff] px-4 py-2 text-sm font-semibold text-[#1a1aff]">
            <ChartLineUpIcon size={16} />
            {`${streamCount} streams monitored`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Open rejections"
          value={String(openRejections)}
          hint="Unacknowledged, rejection severity"
          tone={openRejections > 0 ? 'critical' : 'good'}
        />
        <StatTile
          label="Open items"
          value={String(openViolations.length)}
          hint="Including warnings awaiting review"
        />
        <StatTile
          label="Recorded violations"
          value={String(violations.length)}
          hint="Across all diseases and controls"
        />
        <StatTile
          label="Acknowledged"
          value={`${acknowledgedRate}%`}
          hint={`${acknowledged} of ${violations.length} with a corrective action`}
        />
      </div>

      <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        <h2 className="text-[16px] font-semibold text-[#111827]">Root cause Pareto</h2>
        <p className="mt-1 max-w-3xl text-[13px] text-[#6b7280]">
          Where the lab&apos;s QC failures actually come from, ordered by share of the
          total. The cumulative line shows how few causes explain most of them.
        </p>
        <div className="mt-5">
          {isLoading ? (
            <div className="rounded-xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-4 py-10 text-center text-sm text-[#6b7280]">
              Loading violations...
            </div>
          ) : (
            <ViolationParetoChart tally={rootCauseTally} />
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        <h2 className="text-[16px] font-semibold text-[#111827]">Which rules are firing</h2>
        <p className="mt-1 max-w-3xl text-[13px] text-[#6b7280]">
          Rejection rules are listed before warnings. `1_2s` appears often by design —
          over a long series roughly one run in twenty falls beyond 2 SD, which is why
          Westgard treats it as a prompt to inspect rather than to reject.
        </p>

        {ruleCounts.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-4 py-10 text-center text-sm text-[#6b7280]">
            No violations recorded yet.
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {ruleCounts.map((entry) => {
              const isRejection = ['1_3s', '2_2s', 'R_4s', '4_1s'].includes(entry.rule);

              return (
                <li key={entry.rule} className="flex items-center gap-4">
                  <span className="w-14 shrink-0 text-[13px] font-semibold text-[#111827]">
                    {entry.rule.replace('_', '-')}
                  </span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#f1f5f9]">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${maxRuleCount === 0 ? 0 : (entry.count / maxRuleCount) * 100}%`,
                        backgroundColor: isRejection ? CHART_INK.critical : CHART_INK.warning,
                      }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right text-[13px] tabular-nums text-[#374151]">
                    {entry.count}
                  </span>
                  {/* Severity is never colour-alone. */}
                  <Badge
                    className={
                      isRejection
                        ? 'bg-[#fee2e2] text-[#dc2626]'
                        : 'bg-[#fef3c7] text-[#d97706]'
                    }
                  >
                    {isRejection ? 'Rejection' : 'Warning'}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {openRejections > 0 && (
        <Link
          to="/violations"
          className="flex items-center justify-between gap-4 rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-5 transition-colors hover:bg-[#fee2e2]"
        >
          <span className="flex items-center gap-3 text-[14px] font-semibold text-[#dc2626]">
            <WarningIcon size={18} />
            {`${openRejections} open rejection${openRejections === 1 ? '' : 's'} awaiting review`}
          </span>
          <span className="text-[13px] font-semibold text-[#dc2626]">Open inbox →</span>
        </Link>
      )}
    </div>
  );
}
