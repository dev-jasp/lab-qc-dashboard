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
import type { RollingCVPoint } from '@/utils/qc-calculations';

ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
);

interface RollingCVChartProps {
  points: RollingCVPoint[];
  /** Alert threshold from QC settings, drawn as the watchlist line. */
  threshold: number;
  windowSize?: number;
  /** Pixels, or a CSS length such as "100%" to fill a flex cell. */
  height?: number | string;
}

/**
 * Rolling coefficient of variation across a moving window of runs.
 *
 * Levey-Jennings shows where runs sit; this shows whether the stream's precision
 * is decaying. A rising CV with every point still inside 2 SD is a real finding —
 * the method is getting noisier before it starts failing — and it is invisible on
 * any single-point view.
 *
 * One series, so no legend box: the title names it. The threshold uses the
 * reserved watchlist amber because that is exactly what crossing it means.
 */
export const RollingCVChart: React.FC<RollingCVChartProps> = ({
  points,
  threshold,
  windowSize = 10,
  height = 240,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartJS | null>(null);
  const hasData = points.length > 0;

  useEffect(() => {
    if (canvasRef.current === null || !hasData) {
      chartRef.current?.destroy();
      chartRef.current = null;
      return;
    }

    chartRef.current?.destroy();
    chartRef.current = new ChartJS(canvasRef.current, {
      type: 'line',
      data: {
        labels: points.map((point) => point.endSample),
        datasets: [
          {
            label: 'Rolling CV',
            data: points.map((point) => point.value),
            borderColor: CHART_SERIES.primary,
            backgroundColor: CHART_SERIES.primary,
            borderWidth: 2,
            pointRadius: (context) =>
              (points[context.dataIndex]?.value ?? 0) > threshold ? 4 : 0,
            pointBackgroundColor: CHART_INK.warning,
            pointBorderColor: CHART_SURFACE.light,
            pointBorderWidth: 2,
            tension: 0.3,
          },
          {
            label: 'Alert threshold',
            data: points.map(() => threshold),
            borderColor: CHART_INK.warning,
            borderWidth: 1.5,
            borderDash: [6, 4],
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
          legend: { display: false },
          tooltip: {
            backgroundColor: CHART_INK.primary,
            titleFont: { family: CHART_FONT, size: 12 },
            bodyFont: { family: CHART_FONT, size: 12 },
            padding: 10,
            callbacks: {
              title: (items) => `Through run ${items[0]?.label ?? ''}`,
              label: (item) =>
                item.datasetIndex === 0
                  ? `CV ${Number(item.raw).toFixed(2)}% over ${windowSize} runs`
                  : `Alert threshold ${threshold.toFixed(2)}%`,
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
            beginAtZero: true,
            title: {
              display: true,
              text: `CV over ${windowSize} runs (%)`,
              color: CHART_INK.muted,
              font: { family: CHART_FONT, size: 11 },
            },
            grid: { color: CHART_SURFACE.grid },
            ticks: {
              color: CHART_INK.muted,
              font: { family: CHART_FONT, size: 11 },
              callback: (value) => `${Number(value).toFixed(1)}%`,
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [hasData, points, threshold, windowSize]);

  if (!hasData) {
    return (
      <div className="rounded-xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-4 py-10 text-center text-sm text-[#6b7280]">
        {`At least ${windowSize} runs are needed before a rolling CV can be calculated.`}
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <canvas ref={canvasRef} role="img" aria-label="Rolling coefficient of variation chart" />
    </div>
  );
};
