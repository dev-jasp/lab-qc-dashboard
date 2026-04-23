import { FunnelIcon, ListMagnifyingGlassIcon } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export function History() {
  return (
    <div className="rounded-2xl border border-[#F3F3F3] bg-white p-8 shadow">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em]" style={{ color: '#0000FF' }}>
            Audit Trail
          </p>
          <h1 className="mt-3 text-3xl font-extrabold" style={{ color: '#111827' }}>
            History & Traceability
          </h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-[#F9F9F9] px-4 py-2 text-sm font-semibold" style={{ color: '#64748B' }}>
          <FunnelIcon size={16} />
          Disease + control filters ready
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-xl border border-[#F3F3F3] bg-[#FBFBFB] p-6 lg:col-span-2">
          <p className="text-sm leading-7" style={{ color: '#64748B' }}>
            This page is reserved for the full audit trail, including filters for disease and control type,
            chronological review, and append-only record inspection.
          </p>
        </div>
        <div className="rounded-xl border border-[#F3F3F3] bg-[#FBFBFB] p-6">
          <div className="mb-3 flex items-center gap-2" style={{ color: '#0000FF' }}>
            <ListMagnifyingGlassIcon size={18} />
            <span className="font-bold">Next step</span>
          </div>
          <p className="text-sm" style={{ color: '#64748B' }}>
            Wire disease + control scoped logs from the control monitor submission flow.
          </p>
          <Link to="/monitor" className="mt-5 inline-flex items-center gap-2 font-semibold" style={{ color: '#0000FF' }}>
            Return to monitor
          </Link>
        </div>
      </div>
    </div>
  );
}

