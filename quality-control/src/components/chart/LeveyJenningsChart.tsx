import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { LeveyJenningsChartProps } from '../../types/qc.types';
import { createChartConfig } from '../../utils/chart-config';

// Register Chart.js components
ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend
);

const LeveyJenningsChart: React.FC<LeveyJenningsChartProps> = ({ 
  data, 
  statistics, 
  parameters 
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      console.error('Canvas ref is null');
      return;
    }

    if (!data || data.length === 0) {
      console.error('No data provided for chart');
      return;
    }

    if (!statistics && !parameters) {
      console.error('No statistics or parameters provided');
      return;
    }

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    try {
      const mean = statistics?.mean ?? parameters?.targetMean;
      const sd = statistics?.sd ?? parameters?.targetSD;

      if (mean === undefined || sd === undefined) {
        console.error('Mean or SD is undefined', { mean, sd, statistics, parameters });
        return;
      }

      console.log('Creating chart with:', { dataLength: data.length, mean, sd });

      const config = createChartConfig(data, mean, sd);
      chartRef.current = new ChartJS(canvasRef.current, config);
      
      console.log('Chart created successfully');
    } catch (error) {
      console.error('Error creating chart:', error);
    }
  }, [data, statistics, parameters]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  // Add some debug information
  console.log('Component render:', {
    hasData: !!data,
    dataLength: data?.length,
    hasStatistics: !!statistics,
    hasParameters: !!parameters,
    canvasRefCurrent: !!canvasRef.current
  });

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div style={{ height: '500px', position: 'relative' }}>
        <canvas 
          ref={canvasRef}
          style={{ 
            maxHeight: '100%', 
            maxWidth: '100%' 
          }}
        />
      </div>
    </div>
  );
};

export default LeveyJenningsChart;