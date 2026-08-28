import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
} from 'chart.js';
import type { Plugin } from 'chart.js';
import React, { useEffect, useRef } from 'react';

import { CHART_FONT, CHART_INK, CHART_SERIES, CHART_SURFACE } from '@/utils/chart-theme';

ChartJS.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

export type LotComparisonPoint = {
  /** Lot number, or batch id for in-house. */
  id: string;
  mean: number;
  sd: number;
  cv: number;
  runCount: number;
  status: 'active' | 'archived';
  startDate: string;
};

interface LotComparisonChartProps {
  points: LotComparisonPoint[];
  /** In-house control is partitioned by batch, not by reagent lot. */
  partitionNoun?: 'lot' | 'batch';
  height?: number | string;
}

/** The interval band, faint enough that the mean dot stays the figure. */
const BAND_FILL = 'rgba(26, 26, 255, 0.16)';

/**
 * Draws the mean marker on each interval, and the active lot's mean as a rule
 * running the height of the plot.
 *
 * The rule is the whole point of the panel: a prior lot whose band straddles it
 * is equivalent to the one in service, and one whose band sits clear of it is
 * not. Reading that off two separate charts is guesswork.
 */
const meanMarkerPlugin = (
  points: LotComparisonPoint[],
  partitionNoun: 'lot' | 'batch',
): Plugin<'bar'> => ({
  id: 'lotMeanMarkers',
  afterDatasetsDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    const xScale = scales.x;
    const meta = chart.getDatasetMeta(0);

    if (xScale === undefined) {
      return;
    }

    ctx.save();

    const active = points.find((point) => point.status === 'active');

    if (active !== undefined) {
      const x = xScale.getPixelForValue(active.mean);

      ctx.beginPath();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = CHART_INK.muted;
      ctx.lineWidth = 1.25;
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = CHART_INK.muted;
      ctx.font = `500 10px ${CHART_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${partitionNoun} in service`, x, chartArea.top - 2);
    }

    points.forEach((point, index) => {
      const element = meta.data[index];

      if (element === undefined) {
        return;
      }

      const x = xScale.getPixelForValue(point.mean);
      const y = element.y;

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      // Filled for the lot in service, hollow for a retired one. Status is also
      // spelled out in the row label and the table, so this is never the only cue.
      ctx.fillStyle = point.status === 'active' ? CHART_SERIES.primary : CHART_SURFACE.light;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = CHART_SERIES.primary;
      ctx.stroke();
    });

    ctx.restore();
  },
});

/**
 * Mean and spread of each lot on one shared OD axis.
 *
 * Overlaying the lots' Levey-Jennings lines would be the obvious move and is
 * wrong: two lots have different run counts and unrelated protocol numbers, so a
 * shared x-axis implies a sequence that does not exist. What a changeover
 * actually asks is whether the new lot's central tendency and spread match the
 * old one's, which is a comparison of summaries across a few categories — a dot
 * plot with interval whiskers.
 *
 * Bars would be wrong for the same data: OD variation between lots is small
 * against the absolute value, so bars drawn from zero would render as identical
 * blocks and hide the entire signal.
 *
 * One measure across categories, so one hue.
 */
export const LotComparisonChart: React.FC<LotComparisonChartProps> = ({
  points,
  partitionNoun = 'lot',
  height = 260,
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

    // Frame on the intervals themselves, with a margin so the end caps and the
    // "lot in service" rule are never flush against the plot edge.
    const lowest = Math.min(...points.map((point) => point.mean - 2 * point.sd));
    const highest = Math.max(...points.map((point) => point.mean + 2 * point.sd));
    // A stream with a single run has no spread, so fall back to a window around
    // the mean rather than collapsing the axis to a point.
    const spread = highest - lowest;
    const margin = spread === 0 ? Math.max(Math.abs(highest) * 0.02, 0.01) : spread * 0.18;
    const axisMin = lowest - margin;
    const axisMax = highest + margin;

    chartRef.current?.destroy();
    chartRef.current = new ChartJS(canvasRef.current, {
      type: 'bar',
      data: {
        labels: points.map((point) => point.id),
        datasets: [
          {
            label: 'Mean ±2 SD',
            // Floating bars: each is the ±2 SD interval, not a magnitude from zero.
            data: points.map((point) => [point.mean - 2 * point.sd, point.mean + 2 * point.sd]),
            backgroundColor: BAND_FILL,
            borderColor: CHART_SURFACE.light,
            borderWidth: { top: 1, bottom: 1, left: 0, right: 0 },
            borderRadius: 4,
            barThickness: 14,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 16 } },
        interaction: { mode: 'nearest', intersect: true },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: CHART_INK.primary,
            titleFont: { family: CHART_FONT, size: 12 },
            bodyFont: { family: CHART_FONT, size: 12 },
            padding: 10,
            callbacks: {
              title: (items) => {
                const point = points[items[0]?.dataIndex ?? 0];

                return point === undefined
                  ? ''
                  : `${point.id} — ${point.status === 'active' ? 'in service' : 'retired'}`;
              },
              label: (item) => {
                const point = points[item.dataIndex];

                if (point === undefined) {
                  return '';
                }

                return [
                  `Mean ${point.mean.toFixed(4)}`,
                  `SD ${point.sd.toFixed(4)} · CV ${point.cv.toFixed(2)}%`,
                  `${point.runCount} run${point.runCount === 1 ? '' : 's'} from ${point.startDate}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            // Chart.js anchors a bar axis at zero by default. That would squash
            // every interval into a sliver at the far right, because OD variation
            // between lots is tiny against the absolute reading — the exact
            // failure a dot plot exists to avoid. Frame the data instead.
            min: axisMin,
            max: axisMax,
            title: {
              display: true,
              text: 'OD value',
              color: CHART_INK.muted,
              font: { family: CHART_FONT, size: 11 },
            },
            grid: { color: CHART_SURFACE.grid },
            ticks: {
              color: CHART_INK.muted,
              font: { family: CHART_FONT, size: 11 },
              callback: (value) => Number(value).toFixed(2),
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              color: CHART_INK.secondary,
              font: { family: CHART_FONT, size: 11 },
            },
          },
        },
      },
      plugins: [meanMarkerPlugin(points, partitionNoun)],
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [hasData, partitionNoun, points]);

  if (!hasData) {
    return (
      <div className="rounded-xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-4 py-10 text-center text-sm text-[#6b7280]">
        This control has no lots to compare yet.
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Mean and ±2 SD interval for ${points.length} lot${points.length === 1 ? '' : 's'}, on a shared OD axis`}
      />
    </div>
  );
};
