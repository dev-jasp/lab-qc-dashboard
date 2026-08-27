import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import React, { useEffect, useRef } from 'react';

import { CHART_FONT, CHART_INK, CHART_SERIES, CHART_SURFACE } from '@/utils/chart-theme';
import type { CUSUMResult } from '@/utils/qc-calculations';

ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
);

interface CUSUMChartProps {
  result: CUSUMResult;
  height?: number;
}

/**
 * Tabular CUSUM for a control stream.
 *
 * Sits below the Levey-Jennings chart because it answers the question that chart
 * cannot: Levey-Jennings asks whether *this* run is acceptable, CUSUM asks whether
 * the stream has moved. A sustained shift of well under 2 SD never trips a
 * single-point rule but walks steadily toward the decision interval here.
 *
 * Both sums share one axis in SD units — they are the same measure in opposite
 * directions, so a second scale would be meaningless.
 */
export const CUSUMChart: React.FC<CUSUMChartProps> = ({ result, height = 260 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartJS | null>(null);
  const hasData = result.points.length > 0;

  useEffect(() => {
    if (canvasRef.current === null || !hasData) {
      chartRef.current?.destroy();
      chartRef.current = null;
      return;
    }

    const labels = result.points.map((point) => point.sample);
    const limitLine = result.points.map(() => result.limit);
    const lowerLimitLine = result.points.map(() => -result.limit);

    chartRef.current?.destroy();
    chartRef.current = new ChartJS(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Upward drift',
            data: result.points.map((point) => point.upper),
            borderColor: CHART_SERIES.primary,
            backgroundColor: CHART_SERIES.primary,
            borderWidth: 2,
            pointRadius: (context) =>
              result.points[context.dataIndex]?.upper > result.limit ? 4 : 0,
            pointBackgroundColor: CHART_INK.critical,
            pointBorderColor: CHART_SURFACE.light,
            pointBorderWidth: 2,
            tension: 0.25,
          },
          {
            label: 'Downward drift',
            data: result.points.map((point) => point.lower),
            borderColor: CHART_SERIES.secondary,
            backgroundColor: CHART_SERIES.secondary,
            borderWidth: 2,
            pointRadius: (context) =>
              result.points[context.dataIndex]?.lower < -result.limit ? 4 : 0,
            pointBackgroundColor: CHART_INK.critical,
            pointBorderColor: CHART_SURFACE.light,
            pointBorderWidth: 2,
            tension: 0.25,
          },
          {
            label: `Decision interval (±${result.limit} SD)`,
            data: limitLine,
            borderColor: CHART_INK.critical,
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
          },
          {
            // Paired with the line above; hidden from the legend so the action
            // limit reads as one concept rather than two entries.
            label: '',
            data: lowerLimitLine,
            borderColor: CHART_INK.critical,
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
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
              filter: (item) => item.text !== '',
            },
          },
          tooltip: {
            backgroundColor: CHART_INK.primary,
            titleFont: { family: CHART_FONT, size: 12 },
            bodyFont: { family: CHART_FONT, size: 12 },
            padding: 10,
            callbacks: {
              title: (items) => `Run ${items[0]?.label ?? ''}`,
              label: (item) => {
                const point = result.points[item.dataIndex];

                if (point === undefined) {
                  return '';
                }

                if (item.datasetIndex === 0) {
                  return `Upward drift ${point.upper.toFixed(2)} SD`;
                }

                if (item.datasetIndex === 1) {
                  return `Downward drift ${point.lower.toFixed(2)} SD`;
                }

                return `Decision interval ±${result.limit} SD`;
              },
              afterBody: (items) => {
                const point = result.points[items[0]?.dataIndex ?? 0];

                if (point === undefined) {
                  return '';
                }

                return point.breached
                  ? 'Past the decision interval — systematic shift'
                  : `This run ${point.zScore >= 0 ? '+' : ''}${point.zScore.toFixed(2)} SD`;
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
              maxTicksLimit: 12,
              autoSkip: true,
            },
          },
          y: {
            title: {
              display: true,
              text: 'Cumulative deviation (SD)',
              color: CHART_INK.muted,
              font: { family: CHART_FONT, size: 11 },
            },
            grid: { color: CHART_SURFACE.grid },
            ticks: {
              color: CHART_INK.muted,
              font: { family: CHART_FONT, size: 11 },
            },
            suggestedMin: -result.limit - 1,
            suggestedMax: result.limit + 1,
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [hasData, result]);

  if (!hasData) {
    return (
      <div className="rounded-xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-4 py-10 text-center text-sm text-[#6b7280]">
        No runs yet for this dataset.
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <canvas ref={canvasRef} role="img" aria-label="CUSUM drift chart" />
    </div>
  );
};
