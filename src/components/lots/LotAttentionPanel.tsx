import { ProhibitIcon, QuestionIcon, WarningIcon } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import type { AttentionItem, LotRecord, MissingLot } from '@/lib/lotRegistry';
import type { LotTarget } from '@/components/lots/LotFormDialog';

interface LotAttentionPanelProps {
  items: AttentionItem[];
  onStartLot: (target: LotTarget) => void;
}

type RowTone = 'critical' | 'warning' | 'neutral';

const TONE_CLASS_NAME: Record<RowTone, string> = {
  critical: 'border-[#fecaca] bg-[#fef2f2]',
  warning: 'border-[#fde68a] bg-[#fffbeb]',
  neutral: 'border-[#e5e7eb] bg-[#f9fafb]',
};

const ICON_CLASS_NAME: Record<RowTone, string> = {
  critical: 'bg-[#fee2e2] text-[#dc2626]',
  warning: 'bg-[#fef3c7] text-[#d97706]',
  neutral: 'bg-[#f3f4f6] text-[#6b7280]',
};

function describeRecord(record: LotRecord): string {
  return `${record.diseaseName} · ${record.controlShortLabel}`;
}

function describeMissing(missing: MissingLot): string {
  return `${missing.diseaseName} · ${missing.controlShortLabel}`;
}

function AttentionRow({
  tone,
  icon,
  title,
  detail,
  actionLabel,
  onAction,
}: {
  tone: RowTone;
  icon: React.ReactNode;
  title: string;
  detail: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${TONE_CLASS_NAME[tone]}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ICON_CLASS_NAME[tone]}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#111827]">{title}</p>
          <p className="text-[13px] text-[#6b7280]">{detail}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onAction}
        className="h-9 shrink-0 rounded-full border-[#dbe4ff] bg-white text-[13px] font-semibold text-[#1a1aff]"
      >
        {actionLabel}
      </Button>
    </div>
  );
}

export function LotAttentionPanel({ items, onStartLot }: LotAttentionPanelProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
      <h2 className="mb-4 text-[16px] font-semibold text-[#111827]">Needs attention</h2>
      <div className="space-y-2">
        {items.map((item) => {
          if (item.kind === 'no-active-lot') {
            const { missing } = item;

            return (
              <AttentionRow
                key={`missing:${missing.disease}:${missing.controlType}`}
                tone="neutral"
                icon={<QuestionIcon size={16} />}
                title={describeMissing(missing)}
                detail="No active lot — this control has nothing to record runs against."
                actionLabel={
                  missing.controlType === 'in-house-control' ? 'Start batch' : 'Start lot'
                }
                onAction={() =>
                  onStartLot({ disease: missing.disease, controlType: missing.controlType })
                }
              />
            );
          }

          const { record } = item;
          const isExpired = item.kind === 'expired';
          const expiry = record.expiry;

          const detail = isExpired
            ? `${record.partitionId} expired ${
                expiry.kind === 'expired' && expiry.daysOverdue > 0
                  ? `${expiry.daysOverdue} days ago`
                  : 'today'
              } and is still the active lot.`
            : `${record.partitionId} expires ${
                expiry.kind === 'warning' && expiry.daysRemaining > 0
                  ? `in ${expiry.daysRemaining} days`
                  : 'today'
              }.`;

          return (
            <AttentionRow
              key={`${item.kind}:${record.disease}:${record.controlType}:${record.partitionId}`}
              tone={isExpired ? 'critical' : 'warning'}
              icon={isExpired ? <ProhibitIcon size={16} /> : <WarningIcon size={16} />}
              title={describeRecord(record)}
              detail={detail}
              actionLabel="Renew"
              onAction={() =>
                onStartLot({ disease: record.disease, controlType: record.controlType })
              }
            />
          );
        })}
      </div>
    </div>
  );
}
