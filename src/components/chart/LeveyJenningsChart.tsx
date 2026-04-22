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
  badgeLabel,
  headerActions,
  showChartTitle = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartJS | null>(null);
  const hasData = data.length > 0;

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    if (!hasData) {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      return;
    }

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const mean = statistics?.mean ?? parameters?.targetMean;
    const sd = statistics?.sd ?? parameters?.targetSD;

    if (mean === undefined || sd === undefined) {
      return;
    }

    const config = createChartConfig(data, mean, sd, showChartTitle);
    chartRef.current = new ChartJS(canvasRef.current, config);
  }, [data, hasData, statistics, parameters, showChartTitle]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderColor: '#F3F3F3' }} className="rounded-xl shadow border p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{ background: '#0000FF' }} className="p-2 rounded-lg">
            <TrendingUp className="text-white" size={20} />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: '#1A1C1C' }}>{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {headerActions}
          <div style={{ backgroundColor: '#F9F9F9', color: '#64748B' }} className="rounded-full px-4 py-1.5 text-xs">
            {badgeLabel ?? `${data.length} data points`}
          </div>
        </div>
      </div>
      <div style={{ height: `${height}px`, position: 'relative' }}>
        {hasData ? (
          <canvas 
            ref={canvasRef}
            style={{ 
              maxHeight: '100%', 
              maxWidth: '100%' 
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[#D9E2F1] bg-[#F9FBFF] px-6 text-center">
            <div>
              <p className="text-sm font-semibold text-[#1A1C1C]">No runs recorded for this dataset yet</p>
              <p className="mt-2 text-sm text-[#64748B]">
                Start recording QC entries to generate the Levey-Jennings chart for this control stream.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeveyJenningsChart;
