import { Activity, BarChart3, Calculator, Gauge, Microscope, Sigma, TrendingUp } from 'lucide-react';
import type { RunStatisticsSummary } from '../../types/qc.types';
import type { CVTrendStatus, CVTrendSummary, SparklinePoint } from '../../utils/qc-calculations';

interface StatisticsPanelProps {
  runStatistics: RunStatisticsSummary;
  cvTrend: CVTrendSummary;
}

interface CVSparklineProps {
  points: SparklinePoint[];
  status: CVTrendStatus;
}

const trendStyles: Record<
  CVTrendStatus,
  {
    accent: string;
    background: string;
    border: string;
    label: string;
  }
> = {
  stable: {
    accent: '#047857',
    background: 'rgba(4, 120, 87, 0.08)',
    border: 'rgba(4, 120, 87, 0.2)',
    label: 'Stable'
  },
  rising: {
    accent: '#D97706',
    background: 'rgba(217, 119, 6, 0.08)',
    border: 'rgba(217, 119, 6, 0.2)',
    label: 'Rising'
  },
  high: {
    accent: '#B22222',
    background: 'rgba(178, 34, 34, 0.08)',
    border: 'rgba(178, 34, 34, 0.2)',
    label: 'High CV'
  },
  insufficient_data: {
    accent: '#64748B',
    background: 'rgba(100, 116, 139, 0.08)',
    border: 'rgba(100, 116, 139, 0.2)',
    label: 'Pending'
  }
};

const CVSparkline: React.FC<CVSparklineProps> = ({ points, status }) => {
  if (points.length === 0) {
    return (
      <div
        style={{ backgroundColor: '#F9F9F9', borderColor: '#E5EAF2', color: '#64748B' }}
        className="h-20 rounded-lg border border-dashed flex items-center justify-center text-xs text-center px-3"
      >
        Rolling CV sparkline appears after 10 runs.
      </div>
    );
  }

  const stroke = trendStyles[status].accent;
  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <svg viewBox="0 0 160 48" className="w-full h-20 overflow-visible" role="img" aria-label="Rolling CV sparkline">
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polylinePoints}
      />
      {points.map((point) => (
        <circle
          key={`${point.label}-${point.value}`}
          cx={point.x}
          cy={point.y}
          r="2.5"
          fill={stroke}
        />
      ))}
    </svg>
  );
};

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ runStatistics, cvTrend }) => {
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
      value: `${runStatistics.cv.toFixed(2)}%`,
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

  const activeTrendStyle = trendStyles[cvTrend.status];

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

      <div
        style={{
          backgroundColor: activeTrendStyle.background,
          borderColor: activeTrendStyle.border
        }}
        className="mt-4 rounded-lg border p-4"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} style={{ color: activeTrendStyle.accent }} />
            <div>
              <h4 className="text-sm font-semibold" style={{ color: '#1A1C1C' }}>CV Trend Monitor</h4>
              <p className="text-xs" style={{ color: '#64748B' }}>
                Rolling {cvTrend.windowSize}-run CV with sparkline tracking
              </p>
            </div>
          </div>
          <div
            style={{
              color: activeTrendStyle.accent,
              backgroundColor: '#FFFFFF'
            }}
            className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
          >
            {activeTrendStyle.label}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center">
          <div>
            <div className="flex items-end gap-3 mb-2">
              <div className="text-3xl font-bold leading-none" style={{ color: activeTrendStyle.accent }}>
                {cvTrend.currentCV === null ? '--' : `${cvTrend.currentCV.toFixed(2)}%`}
              </div>
              <div className="text-xs pb-1" style={{ color: '#64748B' }}>
                Threshold {cvTrend.threshold.toFixed(1)}%
              </div>
            </div>
            <p className="text-sm leading-6" style={{ color: '#475569' }}>
              {cvTrend.message}
            </p>
            <p className="text-xs mt-2" style={{ color: '#64748B' }}>
              {cvTrend.rollingCV.length} rolling window{cvTrend.rollingCV.length === 1 ? '' : 's'} evaluated
            </p>
          </div>

          <CVSparkline points={cvTrend.sparklinePoints} status={cvTrend.status} />
        </div>
      </div>
    </div>
  );
};

export default StatisticsPanel;
