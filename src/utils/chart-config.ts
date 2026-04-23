import type { ChartConfiguration, LegendItem, TooltipItem } from 'chart.js';
import type { ChartDataPoint as QCChartDataPoint } from '../types/qc.types';
import { calculateZScore } from './qc-calculations';

const OD_BLUE = '#1A1AFF';

function formatTooltipDate(value: string): string {
  const parsedValue = new Date(value.includes('T') ? value : `${value}T08:00:00`);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
  }).format(parsedValue);
}

function getSDTickLabel(value: number, mean: number, sd: number): string {
  if (sd === 0) {
    return '';
  }

  const offset = Math.round((value - mean) / sd);

  if (Math.abs(mean + offset * sd - value) > sd * 0.15 || Math.abs(offset) > 3) {
    return '';
  }

  if (offset === 0) {
    return 'Mean';
  }

  return `${offset > 0 ? '+' : ''}${offset} SD`;
}

export const createChartConfig = (
  data: QCChartDataPoint[],
  mean: number,
  sd: number,
  showChartTitle: boolean = true,
): ChartConfiguration<'line'> => {
  const pointBackgroundColors = data.map((point) => {
    if (point.isViolation) {
      return OD_BLUE;
    }

    if (point.isEdited) {
      return OD_BLUE;
    }

    if (point.isFlagged) {
      return '#FFFFFF';
    }

    return OD_BLUE;
  });
  const pointBorderColors = data.map((point) => {
    if (point.isViolation) {
      return OD_BLUE;
    }

    if (point.isFlagged) {
      return OD_BLUE;
    }

    return OD_BLUE;
  });
  const pointStyles = data.map((point) => (point.isFlagged ? 'rectRot' : 'circle'));
  const pointRadii = data.map((point) => {
    if (point.isViolation) {
      return 5;
    }

    if (point.isFlagged) {
      return 4;
    }

    return 3.5;
  });
  const yPadding = sd * 0.35;

  return {
    type: 'line' as const,
    data: {
      labels: data.map((d) => d.sample),
      datasets: [
        {
          label: 'OD MEAN',
          data: Array(data.length).fill(mean),
          borderColor: '#8A8F98',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
        {
          label: '+1SD',
          data: Array(data.length).fill(mean + sd),
          borderColor: '#B8BDC5',
          borderWidth: 1.25,
          pointRadius: 0,
          fill: false,
          borderDash: [6, 6],
        },
        {
          label: '-1SD',
          data: Array(data.length).fill(mean - sd),
          borderColor: '#B8BDC5',
          borderWidth: 1.25,
          pointRadius: 0,
          fill: false,
          borderDash: [6, 6],
        },
        {
          label: '+2 SD',
          data: Array(data.length).fill(mean + 2 * sd),
          borderColor: '#F59E0B',
          borderWidth: 1.25,
          pointRadius: 0,
          fill: false,
          borderDash: [4, 5],
        },
        {
          label: '-2 SD',
          data: Array(data.length).fill(mean - 2 * sd),
          borderColor: '#F59E0B',
          borderWidth: 1.25,
          pointRadius: 0,
          fill: false,
          borderDash: [4, 5],
        },
        {
          label: '+3 SD',
          data: Array(data.length).fill(mean + 3 * sd),
          borderColor: '#EF4444',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
        {
          label: '-3 SD',
          data: Array(data.length).fill(mean - 3 * sd),
          borderColor: '#EF4444',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'OD',
          data: data.map((d) => d.value),
          borderColor: OD_BLUE,
          borderWidth: 2,
          borderJoinStyle: 'round' as const,
          borderCapStyle: 'round' as const,
          backgroundColor: OD_BLUE,
          pointBackgroundColor: pointBackgroundColors,
          pointBorderColor: pointBorderColors,
          pointBorderWidth: 2,
          pointRadius: pointRadii,
          pointHoverRadius: pointRadii.map((radius) => radius + 1),
          pointHitRadius: 8,
          pointStyle: pointStyles,
          tension: 0.18,
          cubicInterpolationMode: 'monotone' as const,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 12,
          right: 18,
          bottom: 4,
          left: 10,
        },
      },
      interaction: {
        intersect: true,
        mode: 'nearest' as const,
      },
      plugins: {
        title: {
          display: showChartTitle,
          text: 'Levey-Jennings Quality Control Chart',
          font: { size: 22, weight: 'bold' as const, family: "'Manrope', sans-serif" },
          color: '#1A1C1C',
          padding: { top: 10, bottom: 20 }
        },
        legend: {
          position: 'top' as const,
          labels: {
            boxWidth: 28,
            boxHeight: 2,
            borderRadius: 0,
            padding: 20,
            font: { size: 12, family: "'Manrope', sans-serif" },
            usePointStyle: false,
            color: '#64748B',
            filter: (legendItem: LegendItem) => !['+1SD', '-1SD'].includes(legendItem.text)
          }
        },
        tooltip: {
          backgroundColor: 'rgba(26, 28, 28, 0.95)',
          padding: 12,
          titleFont: { size: 14, weight: 'bold' as const, family: "'Manrope', sans-serif" },
          bodyFont: { size: 13, family: "'Manrope', sans-serif" },
          borderColor: 'rgba(0, 0, 255, 0.5)',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: false,
          intersect: true,
          mode: 'nearest' as const,
          filter: (context: TooltipItem<'line'>) => context.dataset.label === 'OD',
          callbacks: {
            title: (items: TooltipItem<'line'>[]) => {
              const point = data[items[0].dataIndex];
              return `Run #${items[0].dataIndex + 1} - ${formatTooltipDate(point.timestamp)}`;
            },
            label: function(context: TooltipItem<'line'>) {
              const point = data[context.dataIndex];
              const zScore = calculateZScore(point.value, mean, sd);
              const labels = [`Value: ${point.value.toFixed(4)} (${zScore >= 0 ? '+' : ''}${zScore.toFixed(1)} SD)`];

              if (point.isEdited) {
                labels.push('Edited entry');
              }

              return labels;
            },
          },
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Protocol No.',
            font: { size: 12, weight: 600, family: "'Manrope', sans-serif" },
            color: '#64748B',
            padding: { top: 12 }
          },
          grid: {
            color: 'rgba(226, 232, 240, 0.28)',
            lineWidth: 0.8,
            drawTicks: false,
          },
          border: {
            color: 'rgba(229, 234, 242, 0.75)',
          },
          ticks: {
            font: { size: 11, family: "'Manrope', sans-serif" },
            color: '#64748B',
            padding: 10,
          }
        },
        y: {
          title: {
            display: true,
            text: 'OD Value',
            font: { size: 14, weight: 600, family: "'Manrope', sans-serif" },
            color: '#64748B',
            padding: { bottom: 12 }
          },
          min: mean - 3 * sd - yPadding,
          max: mean + 3 * sd + yPadding,
          afterBuildTicks: (scale) => {
            scale.ticks = [-3, -2, -1, 0, 1, 2, 3].map((offset) => ({
              value: mean + offset * sd,
            }));
          },
          grid: {
            color: 'rgba(226, 232, 240, 0.55)',
            lineWidth: 1,
            drawTicks: false,
          },
          border: {
            color: '#E5EAF2',
          },
          ticks: {
            font: { size: 12, family: "'Manrope', sans-serif" },
            color: '#64748B',
            stepSize: sd,
            padding: 12,
            callback: (value) => getSDTickLabel(Number(value), mean, sd)
          }
        },
      },
    },
  };
};
