import type { ChartConfiguration, LegendItem, TooltipItem } from 'chart.js';
import type { ChartDataPoint as QCChartDataPoint } from '../types/qc.types';
import { calculateZScore, getPointColor } from './qc-calculations';


export const createChartConfig = (
  data: QCChartDataPoint[],
  mean: number,
  sd: number
): ChartConfiguration<'line'> => {
  const pointColors = data.map(d => {
    if (d.isViolation) {
      return '#EF4444';
    }

    if (d.isEdited) {
      return '#FF7F50';
    }

    if (d.isFlagged) {
      return '#0000FF';
    }

    const zScore = calculateZScore(d.value, mean, sd);
    return getPointColor(zScore);
  });
  const pointBackgroundColors = data.map((point, index) => (point.isFlagged ? '#FFFFFF' : pointColors[index]));
  const pointStyles = data.map((point) => (point.isFlagged ? 'rectRot' : 'circle'));
  const pointRadii = data.map((point) => {
    if (point.isViolation) {
      return 6;
    }

    if (point.isFlagged) {
      return 5;
    }

    if (point.isEdited) {
      return 4;
    }

    return 4;
  });

  return {
    type: 'line' as const,
    data: {
      labels: data.map((d) => d.sample),
      datasets: [
        {
          label: 'OD MEAN',
          data: Array(data.length).fill(mean),
          borderColor: '#A89F91',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        },
        {
          label: '+1SD',
          data: Array(data.length).fill(mean + sd),
          borderColor: '#A89F91',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          borderDash: [5, 5],
        },
        {
          label: '-1SD',
          data: Array(data.length).fill(mean - sd),
          borderColor: '#A89F91',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          borderDash: [5, 5],
        },
        {
          label: '+2 SD',
          data: Array(data.length).fill(mean + 2 * sd),
          borderColor: '#FFA500',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          borderDash: [3, 3],
        },
        {
          label: '-2 SD',
          data: Array(data.length).fill(mean - 2 * sd),
          borderColor: '#FFA500',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          borderDash: [3, 3],
        },
        {
          label: '+3 SD',
          data: Array(data.length).fill(mean + 3 * sd),
          borderColor: '#B22222',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        },
        {
          label: '-3 SD',
          data: Array(data.length).fill(mean - 3 * sd),
          borderColor: '#B22222',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'OD',
          data: data.map((d) => d.value),
          borderColor: '#0000FF',
          borderWidth: 2,
          borderJoinStyle: 'round' as const,
          borderCapStyle: 'round' as const,
          backgroundColor: pointColors,
          pointBackgroundColor: pointBackgroundColors,
          pointBorderColor: pointColors,
          pointBorderWidth: 1,
          pointRadius: pointRadii,
          pointHoverRadius: pointRadii.map((radius) => radius + 1),
          pointHitRadius: 8,
          pointStyle: pointStyles,
          tension: 0.32,
          cubicInterpolationMode: 'monotone' as const,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
      plugins: {
        title: {
          display: true,
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
            padding: 15,
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
          displayColors: true,
          callbacks: {
            afterLabel: function(context: TooltipItem<'line'>) {
              const point = data[context.dataIndex];
              const zScore = calculateZScore(point.value, mean, sd).toFixed(2);
              return [`Date: ${point.timestamp}`, `Z-Score: ${zScore}`];
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Protocol No.',
            font: { size: 14, weight: 600, family: "'Manrope', sans-serif" },
            color: '#64748B',
            padding: { top: 10 }
          },
          grid: {
            color: '#E2E8F0',
            lineWidth: 1
          },
          ticks: {
            font: { size: 11, family: "'Manrope', sans-serif" },
            color: '#64748B'
          }
        },
        y: {
          title: {
            display: true,
            text: 'OD Value',
            font: { size: 14, weight: 600, family: "'Manrope', sans-serif" },
            color: '#64748B',
            padding: { bottom: 10 }
          },
          suggestedMin: mean - 3.5 * sd,
          suggestedMax: mean + 3.5 * sd,
          grid: {
            color: '#E2E8F0',
            lineWidth: 1
          },
          ticks: {
            font: { size: 11, family: "'Manrope', sans-serif" },
            color: '#64748B'
          }
        },
      },
    },
  };
};
