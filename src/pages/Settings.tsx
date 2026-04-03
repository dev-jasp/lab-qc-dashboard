import { Cog, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';

import { DashboardHeader } from '@/components/layout/DashboardHeader';

export function Settings() {
  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <DashboardHeader activeTab="settings" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl border border-[#F3F3F3] bg-white p-8 shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-lg bg-[#0000FF] p-2">
              <Cog className="text-white" size={20} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em]" style={{ color: '#0000FF' }}>
                System Configuration
              </p>
              <h1 className="text-3xl font-extrabold mt-2" style={{ color: '#111827' }}>
                Settings & Lot Management
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-xl border border-[#F3F3F3] bg-[#FBFBFB] p-6">
              <div className="flex items-center gap-2 mb-3" style={{ color: '#0000FF' }}>
                <SlidersHorizontal size={18} />
                <span className="font-bold">Lab configuration</span>
              </div>
              <p className="text-sm leading-7" style={{ color: '#64748B' }}>
                Active lot management, technician defaults, and disease-specific control parameters will live here.
              </p>
            </div>

            <div className="rounded-xl border border-[#F3F3F3] bg-[#FBFBFB] p-6">
              <p className="text-sm leading-7" style={{ color: '#64748B' }}>
                The router is now ready for disease-scoped settings and lot configuration once you decide how each
                disease should persist its control definitions.
              </p>
              <Link to="/monitor" className="inline-flex items-center gap-2 mt-5 font-semibold" style={{ color: '#0000FF' }}>
                Back to monitor
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

