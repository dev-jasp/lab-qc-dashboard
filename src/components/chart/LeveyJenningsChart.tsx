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
import { useIsMobile } from '../../hooks/use-mobile';
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
  const isMobile = useIsMobile();
  const hasData = data.length > 0;
  const mobileBadgeLabel = badgeLabel?.match(/^total runs:\s*(\d+)$/i)?.[1];
  const resolvedBadgeLabel = isMobile
    ? `${mobileBadgeLabel ?? data.length} runs`
    : (badgeLabel ?? `${data.length} data points`);
  const resolvedHeight = isMobile ? Math.max(height, 360) : height;
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

    const config = createChartConfig(data, mean, sd, showChartTitle, {
      isMobile,
    });
    chartRef.current = new ChartJS(canvasRef.current, config);
  }, [data, hasData, statistics, parameters, showChartTitle, isMobile]);

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
      <div className="mb-4 flex items-start justify-between gap-3 sm:items-center">
        <h3 className="min-w-0 flex-1 text-[16px] font-semibold leading-snug text-[#111827]">{title}</h3>
        <div className="flex items-center gap-2">
          {headerActions}
          <div className="shrink-0 whitespace-nowrap rounded-full bg-[#f3f4f6] px-3 py-1 text-[11px] text-[#6b7280] sm:px-4 sm:py-1.5 sm:text-xs">
            {resolvedBadgeLabel}
          </div>
        </div>
      </div>
      <div style={{ height: `${resolvedHeight}px`, position: 'relative' }}>
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
