import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import LeveyJenningsChart from '@/components/chart/LeveyJenningsChart';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { getDiseaseControls, getDiseaseDefinition } from '@/constants/monitor-config';
import { calculateStatistics } from '@/utils/qc-calculations';

const toneLabel = {
  normal: 'In control',
  warning: 'Watchlist',
  critical: 'Out of bounds',
} as const;

const toneColor = {
  normal: '#0000FF',
  warning: '#B45309',
  critical: '#991B1B',
} as const;

export function DiseaseOverview() {
  const { disease } = useParams();
  const diseaseConfig = getDiseaseDefinition(disease);

  if (!diseaseConfig) {
    return (
      <div className="min-h-screen bg-[#F9F9F9]">
        <DashboardHeader activeTab="monitor" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="rounded-2xl border border-[#F3F3F3] bg-white p-8 shadow">
            <h1 className="text-2xl font-bold" style={{ color: '#1A1C1C' }}>Disease Not Found</h1>
            <p className="mt-3 text-sm" style={{ color: '#64748B' }}>
              The requested surveillance area does not exist in the current QC configuration.
            </p>
            <Link to="/monitor" className="inline-flex items-center gap-2 mt-6 font-semibold" style={{ color: '#0000FF' }}>
              <ArrowLeft size={16} />
              Back to monitor
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const controls = getDiseaseControls(diseaseConfig.slug);

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <DashboardHeader activeTab="monitor" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link to="/monitor" className="inline-flex items-center gap-2 text-sm font-semibold mb-4" style={{ color: '#64748B' }}>
            <ArrowLeft size={16} />
            Back to disease selector
          </Link>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em]" style={{ color: '#0000FF' }}>
                Disease Overview
              </p>
              <h1 className="text-4xl font-extrabold mt-3" style={{ color: '#111827' }}>
                {diseaseConfig.name}
              </h1>
              <p className="text-sm mt-3 max-w-3xl" style={{ color: '#64748B' }}>
                {diseaseConfig.summary}
              </p>
            </div>

            <div
              className="inline-flex items-center rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]"
              style={{ backgroundColor: 'rgba(0,0,255,0.08)', color: '#0000FF' }}
            >
              {diseaseConfig.assayTag}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {controls.map((control) => {
            const statistics = calculateStatistics(control.data);

            return (
              <div key={control.slug} className="space-y-4">
                <div className="rounded-xl border border-[#F3F3F3] bg-white p-5 shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold" style={{ color: '#1A1C1C' }}>
                        {control.label}
                      </h2>
                      <p className="text-sm mt-2" style={{ color: '#64748B' }}>
                        {control.note}
                      </p>
                    </div>
                    <span
                      className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]"
                      style={{ backgroundColor: `${toneColor[control.tone]}14`, color: toneColor[control.tone] }}
                    >
                      {toneLabel[control.tone]}
                    </span>
                  </div>
                </div>

                <LeveyJenningsChart
                  data={control.data}
                  statistics={statistics}
                  parameters={control.parameters}
                  title={control.label}
                  height={280}
                  badgeLabel={control.shortLabel}
                />

                <Link
                  to={`/monitor/${diseaseConfig.slug}/${control.slug}`}
                  className="inline-flex items-center gap-2 text-sm font-bold"
                  style={{ color: '#0000FF' }}
                >
                  Open control monitor
                  <ArrowRight size={16} />
                </Link>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
