import { useRef, useEffect, use } from 'react';
import Chart from 'chart.js/auto';
import { QCStatistics, QCParameters, ChartDataPoint } from '../types/types';



interface LeveyJenningsChartProps {
     data: ChartDataPoint[];
     statstics: QCStatistics; 
     parameters: QCParameters; 
}  

const LeveyJenningsChart: React.FC<LeveyJenningsChartProps> = ({ 
  data, 
  statistics, 
  parameters 
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart.Chart | null>(null);

  useEffect(() => {
    if (canvasRef.current && data.length > 0) {
      if (chartRef.current) {
        chartRef.current.destroy();
      } 

      
const mean = statistics.mean; || parameters.targetMean; 
const sd = statistics.sd; || parameters.targetSD;



   // Color points based on control limits
      const pointColors = data.map(d => {
        const zScore = Math.abs(d.value - mean) / sd;
        if (zScore > 3) return '#dc2626'; // Red for >3SD
        if (zScore > 2) return '#f59e0b'; // Orange for >2SD
        if (zScore > 1) return '#eab308'; // Yellow for >1SD
        return '#16a34a'; // Green for within 1SD
      });

      chartRef.current = new Chart.Chart(canvasRef.current, {
        type: 'line',
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
              position: 'top',
              labels: {
                boxWidth: 20,
                font: { size: 12 }
              }
            },
            tooltip: {
              callbacks: {
                afterLabel: function(context: any) {
                  const point = data[context.dataIndex];
                  const zScore = ((point.value - mean) / sd).toFixed(2);
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
      });
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data, statistics, parameters]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div style={{ height: '500px' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};
