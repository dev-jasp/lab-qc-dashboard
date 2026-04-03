import { Filter, ListFilter } from 'lucide-react';
import { Link } from 'react-router-dom';

import { DashboardHeader } from '@/components/layout/DashboardHeader';

export function History() {
  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <DashboardHeader activeTab="history" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl border border-[#F3F3F3] bg-white p-8 shadow">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em]" style={{ color: '#0000FF' }}>
                Audit Trail
              </p>
              <h1 className="text-3xl font-extrabold mt-3" style={{ color: '#111827' }}>
                History & Traceability
              </h1>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F9F9F9] px-4 py-2 text-sm font-semibold" style={{ color: '#64748B' }}>
              <Filter size={16} />
              Disease + control filters ready
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 rounded-xl border border-[#F3F3F3] bg-[#FBFBFB] p-6">
              <p className="text-sm leading-7" style={{ color: '#64748B' }}>
                This page is reserved for the full audit trail, including filters for disease and control type,
                chronological review, and append-only record inspection.
              </p>
            </div>
            <div className="rounded-xl border border-[#F3F3F3] bg-[#FBFBFB] p-6">
              <div className="flex items-center gap-2 mb-3" style={{ color: '#0000FF' }}>
                <ListFilter size={18} />
                <span className="font-bold">Next step</span>
              </div>
              <p className="text-sm" style={{ color: '#64748B' }}>
                Wire disease + control scoped logs from the control monitor submission flow.
              </p>
              <Link to="/monitor" className="inline-flex items-center gap-2 mt-5 font-semibold" style={{ color: '#0000FF' }}>
                Return to monitor
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

