import { FlaskConical } from 'lucide-react';

import { IsoDatePicker } from '@/components/ui/IsoDatePicker';
import type { InputPanelProps } from '@/types/qc.types';

const fieldClassName =
  'w-full rounded-lg border-2 border-white bg-white px-3.5 py-2 text-sm font-semibold text-[#0000FF] outline-none transition focus:ring-2 focus:ring-blue-200';

export default function InputPanel({
  formValues,
  onFieldChange,
  onAddOD,
  currentLotNumber,
  isReadOnly = false,
}: InputPanelProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onAddOD();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full flex-col rounded-xl p-5 text-white shadow-lg"
      style={{
        background: 'linear-gradient(135deg, #0000FF 0%, #0000CC 100%)',
        color: 'white',
      }}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">New QC Entry</p>
          <h2 className="mt-2 text-xl font-bold">Record run details for this dataset</h2>
        </div>
        <div className="rounded-full bg-white/15 p-2">
          <FlaskConical size={18} />
        </div>
      </div>

      {currentLotNumber && (
        <div className="mb-5 rounded-lg border border-white/20 bg-white/10 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100">Current Lot</p>
          <p className="mt-1 text-sm font-bold">{currentLotNumber}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:max-w-[36rem]">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-blue-50">DATE</label>
          <IsoDatePicker
            value={formValues.date}
            onChange={(value) => onFieldChange('date', value)}
            disabled={isReadOnly}
            className="border-white bg-white text-[#0000FF] hover:bg-blue-50"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-blue-50">OD VALUE (ABS)</label>
          <input
            type="text"
            inputMode="decimal"
            value={formValues.odValue}
            onChange={(event) => onFieldChange('odValue', event.target.value)}
            placeholder="0.0000"
            autoComplete="off"
            disabled={isReadOnly}
            className={fieldClassName}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-blue-50">PROTOCOL NO.</label>
          <input
            type="text"
            value={formValues.protocolNumber}
            onChange={(event) => onFieldChange('protocolNumber', event.target.value)}
            placeholder="Enter protocol number"
            autoComplete="off"
            disabled={isReadOnly}
            className={fieldClassName}
          />
        </div>

      </div>

      <button
        type="submit"
        disabled={isReadOnly}
        className="mt-5 w-full rounded-lg bg-white py-2 text-sm font-bold text-[#0000FF] transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/80 lg:max-w-[36rem]"
      >
        Submit Recording
      </button>
    </form>
  );
}
