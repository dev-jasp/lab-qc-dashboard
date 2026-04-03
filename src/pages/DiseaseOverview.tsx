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
  const warningCount = controls.filter((control) => control.tone === 'warning').length;
  const criticalCount = controls.filter((control) => control.tone === 'critical').length;
  const latestTimestamp = controls
    .flatMap((control) => control.data.map((point) => point.timestamp))
    .sort()
    .at(-1);

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

          <div className="mt-5 flex flex-wrap gap-3">
            <div
              className="rounded-xl border px-4 py-3"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#F3F3F3' }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: '#64748B' }}>
                Controls
              </p>
              <p className="mt-1 text-lg font-bold" style={{ color: '#111827' }}>
                {controls.length} active
              </p>
            </div>
            <div
              className="rounded-xl border px-4 py-3"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#F3F3F3' }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: '#64748B' }}>
                QC Status
              </p>
              <p className="mt-1 text-lg font-bold" style={{ color: criticalCount > 0 ? '#991B1B' : warningCount > 0 ? '#B45309' : '#0F766E' }}>
                {criticalCount > 0 ? `${criticalCount} action required` : warningCount > 0 ? `${warningCount} watchlist` : 'All stable'}
              </p>
            </div>
            <div
              className="rounded-xl border px-4 py-3"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#F3F3F3' }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: '#64748B' }}>
                Last Updated
              </p>
              <p className="mt-1 text-lg font-bold" style={{ color: '#111827' }}>
                {latestTimestamp ?? 'No runs'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {controls.map((control) => {
            const statistics = calculateStatistics(control.data);

            return (
              <div key={control.slug} className="space-y-4">
                <LeveyJenningsChart
                  data={control.data}
                  statistics={statistics}
                  parameters={control.parameters}
                  title={control.label}
                  height={280}
                  badgeLabel={toneLabel[control.tone]}
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
