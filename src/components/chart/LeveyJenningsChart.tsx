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
  title = 'Levey-Jennings Quality Control Chart',
  height = 550,
  badgeLabel,
  headerActions,
  showChartTitle = true,
  variant = 'card',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartJS | null>(null);
  const hasData = data.length > 0;
  const containerClassName =
    variant === 'plain'
      ? 'p-0'
      : 'qc-card';

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
    <div className={containerClassName}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-[16px] font-semibold text-[#111827]">{title}</h3>
        <div className="flex items-center gap-2">
          {headerActions}
          <div className="rounded-full bg-[#f3f4f6] px-4 py-1.5 text-xs text-[#6b7280]">
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
