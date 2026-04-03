import { Activity, BarChart3, Calculator, Gauge, Microscope, Sigma } from 'lucide-react';
import type { StatisticsPanelProps } from '../../types/qc.types';

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ runStatistics }) => {
  const statCards = [
    {
      label: 'Mean',
      value: runStatistics.mean.toFixed(3),
      icon: BarChart3,
      accent: '#0000FF'
    },
    {
      label: 'SD',
      value: runStatistics.sd.toFixed(3),
      icon: Activity,
      accent: '#4F46E5'
    },
    {
      label: 'Sum',
      value: runStatistics.sum.toFixed(3),
      icon: Sigma,
      accent: '#0F766E'
    },
    {
      label: 'CV',
      value: `${runStatistics.cv.toFixed(1)}%`,
      icon: Calculator,
      accent: '#B45309'
    },
    {
      label: 'Last OD',
      value: runStatistics.lastOD === null ? '-' : runStatistics.lastOD.toFixed(3),
      icon: Microscope,
      accent: '#7C3AED'
    },
    {
      label: 'Total Runs',
      value: runStatistics.totalRuns.toString(),
      icon: Gauge,
      accent: '#334155'
    },
    {
      label: 'Confidence',
      value: `${runStatistics.confidence.toFixed(1)}%`,
      icon: Activity,
      accent: '#047857'
    }
  ];

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderColor: '#F3F3F3' }} className="rounded-xl shadow border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div style={{ background: '#0000FF' }} className="p-1.5 rounded-lg">
            <BarChart3 className="text-white" size={16} />
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: '#1A1C1C' }}>Run Statistics</h3>
            <p className="text-xs uppercase tracking-wide" style={{ color: '#64748B' }}>
              Analytical summary of the active QC run set
            </p>
          </div>
        </div>
        <div style={{ backgroundColor: '#F9F9F9', color: '#64748B' }} className="rounded-full px-3 py-1 text-[11px]">
          {runStatistics.totalRuns} runs
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 auto-rows-fr">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              style={{ backgroundColor: '#F9F9F9', borderColor: '#E5EAF2' }}
              className="rounded-lg border p-3 min-h-[92px] h-full flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#2563EB' }}>
                  {card.label}
                </span>
                <Icon size={14} style={{ color: card.accent }} />
              </div>
              <div className="text-lg font-bold leading-none" style={{ color: '#1A1C1C' }}>
                {card.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatisticsPanel;
