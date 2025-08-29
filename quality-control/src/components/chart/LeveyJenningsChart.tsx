import React, { useEffect, useRef } from 'react';
import * as Chart from 'chart.js';
import type { LeveyJenningsChartProps } from '../../types/qc.types';
import { createChartConfig } from '../../utils/chart-config';

const LeveyJenningsChart: React.FC<LeveyJenningsChartProps> = ({ 
  data, 
  statistics, 
  parameters 
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart.Chart | null>(null);

  useEffect(() => {
    if (canvasRef.current && data.length > 0) {
      // Destroy existing chart
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const mean = statistics.mean || parameters.targetMean;
      const sd = statistics.sd || parameters.targetSD;

      const config = createChartConfig(data, mean, sd);
      chartRef.current = new Chart.Chart(canvasRef.current, config);
    }

    // Cleanup function
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

export default LeveyJenningsChart;