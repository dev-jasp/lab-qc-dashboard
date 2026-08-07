import { XIcon } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { IsoDatePicker } from '@/components/ui/IsoDatePicker';
import type { DateRange } from '@/lib/exportCatalog';
import type { DiseaseSlug } from '@/types/qc.types';
import { cn } from '@/utils/cn';

export type DiseaseFilterOption = {
  slug: DiseaseSlug;
  name: string;
  streamCount: number;
};

interface ExportFilterBarProps {
  diseases: DiseaseFilterOption[];
  selectedDisease: DiseaseSlug | 'all';
  onSelectDisease: (disease: DiseaseSlug | 'all') => void;
  dateRange: DateRange;
  onChangeDateRange: (range: DateRange) => void;
  totalStreams: number;
}

const PILL_CLASS_NAME =
  'h-9 rounded-full border border-[#dbe3ef] bg-white px-4 text-[13px] font-semibold text-[#374151] transition-colors hover:bg-[#f8fafc]';
const PILL_ACTIVE_CLASS_NAME = 'border-[#1a1aff] bg-[#eef2ff] text-[#1a1aff] hover:bg-[#eef2ff]';
const DATE_FIELD_CLASS_NAME =
  'h-9 rounded-full border-[#dbe3ef] bg-white text-[13px] font-semibold text-[#111827] hover:bg-[#f8fafc]';

export function ExportFilterBar({
  diseases,
  selectedDisease,
  onSelectDisease,
  dateRange,
  onChangeDateRange,
  totalStreams,
}: ExportFilterBarProps) {
  const hasDateFilter = dateRange.from !== null || dateRange.to !== null;

  return (
    <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
            Disease
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSelectDisease('all')}
              className={cn(PILL_CLASS_NAME, selectedDisease === 'all' && PILL_ACTIVE_CLASS_NAME)}
            >
              {`All `}
              <span className="ml-1 text-[#9ca3af]">{totalStreams}</span>
            </button>
            {diseases.map((disease) => (
              <button
                key={disease.slug}
                type="button"
                onClick={() => onSelectDisease(disease.slug)}
                className={cn(
                  PILL_CLASS_NAME,
                  selectedDisease === disease.slug && PILL_ACTIVE_CLASS_NAME,
                )}
              >
                {disease.name}
                <span className="ml-1 text-[#9ca3af]">{disease.streamCount}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
              From
            </label>
            <IsoDatePicker
              value={dateRange.from ?? ''}
              onChange={(value) => onChangeDateRange({ ...dateRange, from: value })}
              className={cn(DATE_FIELD_CLASS_NAME, 'sm:w-40')}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
              To
            </label>
            <IsoDatePicker
              value={dateRange.to ?? ''}
              onChange={(value) => onChangeDateRange({ ...dateRange, to: value })}
              className={cn(DATE_FIELD_CLASS_NAME, 'sm:w-40')}
            />
          </div>
          {hasDateFilter && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onChangeDateRange({ from: null, to: null })}
              className="h-9 gap-1.5 rounded-full text-[13px] font-semibold text-[#6b7280] hover:text-[#111827]"
            >
              <XIcon size={14} />
              Clear dates
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
