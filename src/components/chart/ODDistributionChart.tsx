import {
  BarController,
  BarElement,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
} from 'chart.js';
import type { Plugin } from 'chart.js';
import React, { useEffect, useRef } from 'react';

import {
  CHART_FONT,
  CHART_INK,
  CHART_SERIES,
  CHART_SURFACE,
  SD_BAND,
} from '@/utils/chart-theme';
import type { ODDistribution } from '@/utils/qc-calculations';

ChartJS.register(BarController, BarElement, LinearScale, Tooltip);

interface ODDistributionChartProps {
  distribution: ODDistribution;
  /** Pixels, or a CSS length such as "100%" to fill a flex cell. */
  height?: number | string;
}

type Boundary = {
  z: number;
  label: string;
  color: string;
  width: number;
  dash: number[];
};

const BOUNDARIES: Boundary[] = [
  { z: -3, label: '-3 SD', ...pick('threeSD') },
  { z: -2, label: '-2 SD', ...pick('twoSD') },
  { z: -1, label: '-1 SD', ...pick('oneSD') },
  { z: 0, label: 'Mean', ...pick('mean') },
  { z: 1, label: '+1 SD', ...pick('oneSD') },
  { z: 2, label: '+2 SD', ...pick('twoSD') },
  { z: 3, label: '+3 SD', ...pick('threeSD') },
];

function pick(band: keyof typeof SD_BAND): Omit<Boundary, 'z' | 'label'> {
  const { color, width, dash } = SD_BAND[band];

  return { color, width, dash: [...dash] };
}

/**
 * Draws the SD boundaries over the bars, each one labelled.
 *
 * The labels are not decoration. The dataviz validator flags the amber ±2 SD
 * line at 2.09:1 against white, a contrast warning that obligates a visible
 * label rather than leaving the colour to carry the band on its own.
 */
const sdBoundaryPlugin: Plugin<'bar'> = {
  id: 'sdBoundaries',
  afterDatasetsDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    const xScale = scales.x;

    if (xScale === undefined) {
      return;
    }

    ctx.save();

    for (const boundary of BOUNDARIES) {
      if (boundary.z < xScale.min || boundary.z > xScale.max) {
        continue;
      }

      const x = xScale.getPixelForValue(boundary.z);

      ctx.beginPath();
      ctx.setLineDash(boundary.dash);
      ctx.strokeStyle = boundary.color;
      ctx.lineWidth = boundary.width;
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = CHART_INK.muted;
      ctx.font = `500 10px ${CHART_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(boundary.label, x, chartArea.top - 2);
    }

    ctx.restore();
  },
};

/**
 * How the OD values are distributed, rather than how they are sequenced.
 *
 * Every other chart on this page reads the runs in order. This one reads them as
 * a population, which is the assumption the Westgard limits rest on: ±2 SD only
 * means "warning" because a normal distribution puts ~95% inside it. A bimodal
 * or skewed histogram says those limits are describing a distribution the data
 * does not have.
 *
 * One measure across bins, so one hue and no legend box — the panel title names
 * the series. The boundaries are the reserved SD palette, matching Levey-Jennings
 * exactly, and each is labelled directly.
 */
export const ODDistributionChart: React.FC<ODDistributionChartProps> = ({
  distribution,
  height = 260,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartJS | null>(null);
  const hasData = distribution.bins.length > 0;

  useEffect(() => {
    if (canvasRef.current === null || !hasData) {
      chartRef.current?.destroy();
      chartRef.current = null;
      return;
    }

    const { bins, sampleCount } = distribution;
    const width = bins[0].endZ - bins[0].startZ;

    chartRef.current?.destroy();
    chartRef.current = new ChartJS(canvasRef.current, {
      type: 'bar',
      data: {
        datasets: [
          {
            label: 'Runs',
            data: bins.map((bin) => ({ x: bin.midZ, y: bin.count })),
            backgroundColor: CHART_SERIES.primary,
            // A 2px surface ring keeps adjacent bars from reading as one block.
            borderColor: CHART_SURFACE.light,
            borderWidth: { top: 0, bottom: 0, left: 1, right: 1 },
            borderRadius: 4,
            borderSkipped: 'bottom',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        // Room above the plot for the boundary labels.
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
                const bin = bins[items[0]?.dataIndex ?? 0];

                return bin === undefined
                  ? ''
                  : `OD ${bin.start.toFixed(4)} to ${bin.end.toFixed(4)}`;
              },
              label: (item) => {
                const bin = bins[item.dataIndex];

                if (bin === undefined) {
                  return '';
                }

                const share = ((bin.count / sampleCount) * 100).toFixed(1);

                return `${bin.count} run${bin.count === 1 ? '' : 's'} (${share}%)`;
              },
              afterLabel: (item) => {
                const bin = bins[item.dataIndex];

                return bin === undefined
                  ? ''
                  : `${bin.startZ.toFixed(1)} to ${bin.endZ.toFixed(1)} SD from mean`;
              },
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            offset: false,
            min: bins[0].startZ - width / 2,
            max: bins[bins.length - 1].endZ + width / 2,
            grid: { display: false },
            title: {
              display: true,
              text: 'Distance from mean (SD)',
              color: CHART_INK.muted,
              font: { family: CHART_FONT, size: 11 },
            },
            ticks: {
              color: CHART_INK.muted,
              font: { family: CHART_FONT, size: 11 },
              stepSize: 1,
              callback: (value) => {
                const z = Number(value);

                return Number.isInteger(z) ? String(z) : '';
              },
            },
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Runs',
              color: CHART_INK.muted,
              font: { family: CHART_FONT, size: 11 },
            },
            grid: { color: CHART_SURFACE.grid },
            ticks: {
              color: CHART_INK.muted,
              font: { family: CHART_FONT, size: 11 },
              precision: 0,
            },
          },
        },
      },
      plugins: [sdBoundaryPlugin],
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [distribution, hasData]);

  if (!hasData) {
    return (
      <div className="rounded-xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-4 py-10 text-center text-sm text-[#6b7280]">
        At least 2 runs are needed before a distribution can be drawn.
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Distribution of ${distribution.sampleCount} OD values across ${distribution.bins.length} bins, with mean and standard deviation boundaries`}
      />
    </div>
  );
};
