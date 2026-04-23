import { ShieldCheckIcon, WarningIcon } from '@phosphor-icons/react';

import { DEFAULT_QC_RULES } from '@/constants/qc-rules';

import type { QCRule, WestgardRule } from '@/types/qc.types';

const RULE_LABELS: Record<WestgardRule, string> = {
  '1_2s': '1-2s',
  '1_3s': '1-3s',
  '2_2s': '2-2s',
  R_4s: 'R-4s',
  '4_1s': '4-1s',
  '10x': '10x',
  '7T': '7T',
};

interface QCRulesReferenceCardProps {
  className?: string;
  minRunsForWestgard: number;
}

function getSeverityMeta(severity: QCRule['severity']) {
  if (severity === 'rejection') {
    return {
      label: 'Rejection',
      badgeClassName: 'bg-[#fee2e2] text-[#dc2626]',
      borderClassName: 'border-[#fecaca]',
      accentClassName: 'text-[#dc2626]',
      note: 'Requires corrective action review',
    };
  }

  return {
    label: 'Warning',
    badgeClassName: 'bg-[#fef3c7] text-[#d97706]',
    borderClassName: 'border-[#fde68a]',
    accentClassName: 'text-[#d97706]',
    note: 'Watchlist signal for follow-up',
  };
}

export function QCRulesReferenceCard({ className = '', minRunsForWestgard }: QCRulesReferenceCardProps) {
  return (
    <section className={`qc-card ${className}`.trim()} aria-labelledby="qc-rules-reference-heading">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eff6ff] text-[#1a1aff]">
              <ShieldCheckIcon size={18} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#9ca3af]">QC Rule Reference</p>
          </div>
          <h2 id="qc-rules-reference-heading" className="text-[16px] font-semibold text-[#111827]">
            Westgard QC Rules
          </h2>
          <p className="mt-2 text-[13px] leading-6 text-[#6b7280]">
            Complete rules list used by this monitor. Evaluation begins after {minRunsForWestgard} control runs.
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#f8fafc] px-3 py-1.5 text-[12px] font-semibold text-[#475569]">
          <WarningIcon size={14} />
          {`${DEFAULT_QC_RULES.length} active rules`}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {DEFAULT_QC_RULES.map((rule) => {
          const severityMeta = getSeverityMeta(rule.severity);

          return (
            <article key={rule.name} className={`rounded-2xl border bg-white p-4 ${severityMeta.borderClassName}`}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className={`text-[18px] font-bold ${severityMeta.accentClassName}`}>{RULE_LABELS[rule.name]}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]">
                    Westgard rule
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${severityMeta.badgeClassName}`}>
                  {severityMeta.label}
                </span>
              </div>

              <p className="text-[13px] leading-6 text-[#374151]">{rule.description}</p>
              <p className="mt-3 text-[12px] font-medium text-[#6b7280]">{severityMeta.note}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
