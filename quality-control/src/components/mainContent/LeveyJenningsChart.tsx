import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface ChartDataPoint {
  sample: string;
  value: number;
}

interface LeveyJenningsChartProps {
  data: ChartDataPoint[];
  mean: number;
  sd: number;
}

const LeveyJenningsChart: React.FC<LeveyJenningsChartProps> = ({ data, mean, sd }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      // Destroy existing chart instance to prevent memory leaks
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      // Create new chart
      chartRef.current = new Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels: data.map((d) => d.sample),
          datasets: [
            {
              label: 'QC Data',
              data: data.map((d) => d.value),
              borderColor: '#1f77b4',
              backgroundColor: '#1f77b4',
              pointRadius: 4,
              pointHoverRadius: 6,
              fill: false,
            },
            {
              label: 'Mean',
              data: Array(data.length).fill(mean),
              borderColor: '#ff7f0e',
              borderWidth: 2,
              pointRadius: 0,
              fill: false,
              borderDash: [5, 5],
            },
            {
              label: '+1SD',
              data: Array(data.length).fill(mean + sd),
              borderColor: '#2ca02c',
              borderWidth: 1,
              pointRadius: 0,
              fill: false,
              borderDash: [3, 3],
            },
            {
              label: '-1SD',
              data: Array(data.length).fill(mean - sd),
              borderColor: '#2ca02c',
              borderWidth: 1,
              pointRadius: 0,
              fill: false,
              borderDash: [3, 3],
            },
            {
              label: '+2SD',
              data: Array(data.length).fill(mean + 2 * sd),
              borderColor: '#d62728',
              borderWidth: 1,
              pointRadius: 0,
              fill: false,
              borderDash: [3, 3],
            },
            {
              label: '-2SD',
              data: Array(data.length).fill(mean - 2 * sd),
              borderColor: '#d62728',
              borderWidth: 1,
              pointRadius: 0,
              fill: false,
              borderDash: [3, 3],
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Levey-Jennings Quality Control Chart',
              font: { size: 18 },
            },
            legend: {
              position: 'top',
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Sample Number',
              },
            },
            y: {
              title: {
                display: true,
                text: 'Measurement Value',
              },
              suggestedMin: mean - 3 * sd,
              suggestedMax: mean + 3 * sd,
            },
          },
        },
      });
    }

    // Cleanup on component unmount
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data, mean, sd]);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 mt-10 bg-slate-100 shadow-md rounded-lg">
      <canvas ref={canvasRef} className="w-full h-96" />
    </div>
  );
};

export default LeveyJenningsChart;