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
import { TrendingUp } from 'lucide-react';
import type { LeveyJenningsChartProps } from '../../types/qc.types';
import { createChartConfig } from '../../utils/chart-config';

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
  parameters,
  title = 'Quality Control Chart',
  height = 550,
  badgeLabel
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
    <div style={{ backgroundColor: '#FFFFFF', borderColor: '#F3F3F3' }} className="rounded-xl shadow border p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{ background: '#0000FF' }} className="p-2 rounded-lg">
            <TrendingUp className="text-white" size={20} />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: '#1A1C1C' }}>{title}</h3>
        </div>
        <div style={{ backgroundColor: '#F9F9F9', color: '#64748B' }} className="rounded-full px-4 py-1.5 text-xs">
          {badgeLabel ?? `${data.length} data points`}
        </div>
      </div>
      <div style={{ height: `${height}px`, position: 'relative' }}>
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
