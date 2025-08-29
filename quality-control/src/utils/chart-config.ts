import type { ChartDataPoint } from '../types/qc.types';
import { calculateZScore, getPointColor } from './qc-calculations';
import type { TooltipItem } from 'chart.js';


export const createChartConfig = (
  data: ChartDataPoint[], 
  mean: number, 
  sd: number
) => {
  const pointColors = data.map(d => {
    const zScore = calculateZScore(d.value, mean, sd);
    return getPointColor(zScore);
  });

  return {
    type: 'line' as const,
    data: {
      labels: data.map((d) => d.sample),
      datasets: [
        {
          label: 'QC Data',
          data: data.map((d) => d.value),
          borderColor: '#1f77b4',
          backgroundColor: pointColors,
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors,
          pointRadius: 6,
          pointHoverRadius: 8,
          fill: false,
        },
        {
          label: 'Target Mean',
          data: Array(data.length).fill(mean),
          borderColor: '#059669',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        },
        {
          label: '+1SD',
          data: Array(data.length).fill(mean + sd),
          borderColor: '#65a30d',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          borderDash: [5, 5],
        },
        {
          label: '-1SD',
          data: Array(data.length).fill(mean - sd),
          borderColor: '#65a30d',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          borderDash: [5, 5],
        },
        {
          label: '+2SD',
          data: Array(data.length).fill(mean + 2 * sd),
          borderColor: '#f59e0b',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          borderDash: [3, 3],
        },
        {
          label: '-2SD',
          data: Array(data.length).fill(mean - 2 * sd),
          borderColor: '#f59e0b',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          borderDash: [3, 3],
        },
        {
          label: '+3SD',
          data: Array(data.length).fill(mean + 3 * sd),
          borderColor: '#dc2626',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        },
        {
          label: '-3SD',
          data: Array(data.length).fill(mean - 3 * sd),
          borderColor: '#dc2626',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Levey-Jennings Quality Control Chart',
          font: { size: 20, weight: 'bold' },
          color: '#1f2937',
        },
        legend: {
          position: 'top' as const,
          labels: {
            boxWidth: 20,
            font: { size: 12 }
          }
        },
        tooltip: {
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
            text: 'Sample Number',
            font: { size: 14, weight: 'bold' }
          },
          grid: {
            color: '#e5e7eb'
          }
        },
        y: {
          title: {
            display: true,
            text: 'OD Value',
            font: { size: 14, weight: 'bold' }
          },
          suggestedMin: mean - 3.5 * sd,
          suggestedMax: mean + 3.5 * sd,
          grid: {
            color: '#e5e7eb'
          }
        },
      },
    },
  };
};