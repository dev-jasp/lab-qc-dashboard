import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import React, { useEffect, useMemo, useRef } from 'react';

import {
  CHART_FONT,
  CHART_INK,
  CHART_SERIES,
  CHART_SURFACE,
  ROOT_CAUSE_LABELS,
} from '@/utils/chart-theme';

ChartJS.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
);

export type RootCauseCount = {
  rootCause: string;
  count: number;
};

interface ViolationParetoChartProps {
  tally: RootCauseCount[];
  height?: number;
}

/**
 * Pareto of corrective-action root causes: which failures actually account for
 * the lab's QC rejections, ordered so the few that dominate come first.
 *
 * A textbook Pareto puts counts on a left axis and the cumulative percentage on a
 * right one. Two scales on one plot let either be rescaled independently, so the
 * crossing point between bar and line means nothing — it is an artefact of the
 * axis ranges. Both series are percentages of the same total here, which is the
 * comparison the chart is actually for, and they share one axis. Raw counts stay
 * available in the tooltip, where they cannot distort the geometry.
 */
export const ViolationParetoChart: React.FC<ViolationParetoChartProps> = ({
  tally,
  height = 300,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartJS | null>(null);

  const model = useMemo(() => {
    const ordered = [...tally].sort((left, right) => right.count - left.count);
    const total = ordered.reduce((sum, item) => sum + item.count, 0);

    if (total === 0) {
      return { ordered, total, shares: [], cumulative: [] };
    }

    let running = 0;
    const shares = ordered.map((item) => (item.count / total) * 100);
    const cumulative = ordered.map((item) => {
      running += item.count;
      return (running / total) * 100;
    });

    return { ordered, total, shares, cumulative };
  }, [tally]);

  const hasData = model.total > 0;

  useEffect(() => {
    if (canvasRef.current === null || !hasData) {
      chartRef.current?.destroy();
      chartRef.current = null;
      return;
    }

    chartRef.current?.destroy();
    chartRef.current = new ChartJS(canvasRef.current, {
      data: {
        labels: model.ordered.map(
          (item) => ROOT_CAUSE_LABELS[item.rootCause] ?? item.rootCause,
        ),
        datasets: [
          {
            type: 'bar' as const,
            label: 'Share of violations',
            data: model.shares,
            backgroundColor: CHART_SERIES.primary,
            // One hue for every bar: they are the same measure across categories.
            // Colouring by rank would imply the categories are different series.
            borderRadius: 4,
            borderSkipped: false,
            // A 2px surface gap so adjacent bars read as separate marks.
            barPercentage: 0.82,
            categoryPercentage: 0.86,
            order: 2,
          },
          {
            type: 'line' as const,
            label: 'Cumulative share',
            data: model.cumulative,
            borderColor: CHART_SERIES.secondary,
            backgroundColor: CHART_SERIES.secondary,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: CHART_SERIES.secondary,
            pointBorderColor: CHART_SURFACE.light,
            pointBorderWidth: 2,
            tension: 0.2,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: 'circle',
              color: CHART_INK.secondary,
              font: { family: CHART_FONT, size: 12 },
            },
          },
          tooltip: {
            backgroundColor: CHART_INK.primary,
            titleFont: { family: CHART_FONT, size: 12 },
            bodyFont: { family: CHART_FONT, size: 12 },
            padding: 10,
            callbacks: {
              label: (item) => {
                const entry = model.ordered[item.dataIndex];

                if (entry === undefined) {
                  return '';
                }

                if (item.datasetIndex === 0) {
                  const runLabel = entry.count === 1 ? 'violation' : 'violations';
                  return `${entry.count} ${runLabel} · ${model.shares[item.dataIndex].toFixed(1)}%`;
                }

                return `Cumulative ${model.cumulative[item.dataIndex].toFixed(1)}%`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: CHART_INK.muted,
              font: { family: CHART_FONT, size: 11 },
              maxRotation: 30,
              minRotation: 0,
              autoSkip: false,
            },
          },
          y: {
            // One axis, shared: both series are percentages of the same total.
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Share of acknowledged violations (%)',
              color: CHART_INK.muted,
              font: { family: CHART_FONT, size: 11 },
            },
            grid: { color: CHART_SURFACE.grid },
            ticks: {
              color: CHART_INK.muted,
              font: { family: CHART_FONT, size: 11 },
              callback: (value) => `${value}%`,
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [hasData, model]);

  if (!hasData) {
    return (
      <div className="rounded-xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-4 py-10 text-center text-sm text-[#6b7280]">
        No corrective actions recorded yet. Root causes appear here once violations
        are acknowledged.
      </div>
    );
  }

  return (
    <div>
      <div style={{ height }}>
        <canvas ref={canvasRef} role="img" aria-label="Violation root cause Pareto chart" />
      </div>
      {/* Identity is never colour-alone: the same numbers as a table. */}
      <table className="mt-4 w-full text-left text-[13px]">
        <caption className="sr-only">Violations by root cause</caption>
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.05em] text-[#94a3b8]">
            <th scope="col" className="py-2 font-semibold">
              Root cause
            </th>
            <th scope="col" className="py-2 text-right font-semibold">
              Violations
            </th>
            <th scope="col" className="py-2 text-right font-semibold">
              Share
            </th>
            <th scope="col" className="py-2 text-right font-semibold">
              Cumulative
            </th>
          </tr>
        </thead>
        <tbody>
          {model.ordered.map((item, index) => (
            <tr key={item.rootCause} className="border-t border-[#eef2f7] text-[#374151]">
              <td className="py-2">{ROOT_CAUSE_LABELS[item.rootCause] ?? item.rootCause}</td>
              <td className="py-2 text-right tabular-nums">{item.count}</td>
              <td className="py-2 text-right tabular-nums">
                {model.shares[index].toFixed(1)}%
              </td>
              <td className="py-2 text-right tabular-nums">
                {model.cumulative[index].toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
