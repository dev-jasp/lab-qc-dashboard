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
  type Chart,
  type ChartConfiguration,
  type Plugin,
} from 'chart.js';

import type { PrintableChartDataPoint } from '@/types/export';

ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
);

export interface PrintableQCLayoutProps {
  disease: string;
  controlType: string;
  controlLabel: string;
  year: number;
  mean: number;
  sd: number;
  cv: number;
  totalRuns: number;
  lotNumber?: string;
  chartData: PrintableChartDataPoint[];
}

const chartAreaBackground: Plugin<'line'> = {
  id: 'chartAreaBackground',
  beforeDraw(chart: Chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) {
      return;
    }
    ctx.save();
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
    ctx.restore();
  },
};

function formatGeneratedAt(): string {
  try {
    return new Date().toLocaleString('en-PH');
  } catch {
    return new Date().toLocaleString();
  }
}

export const PrintableQCLayout = React.forwardRef<HTMLDivElement, PrintableQCLayoutProps>(
  function PrintableQCLayout(
    {
      disease,
      controlType,
      controlLabel,
      year,
      mean,
      sd,
      cv,
      totalRuns,
      lotNumber,
      chartData,
    },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstanceRef = useRef<ChartJS | null>(null);

    useEffect(() => {
      if (!canvasRef.current || chartData.length === 0) {
        return;
      }

      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }

      const odValues = chartData.map((point) => point.odValue);
      const labels = chartData.map((point) => point.protocolNumber);
      const n = chartData.length;

      const config: ChartConfiguration<'line'> = {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'OD',
              data: odValues,
              borderColor: '#1d4ed8',
              pointBackgroundColor: '#1d4ed8',
              pointBorderColor: '#1d4ed8',
              pointRadius: 4,
              borderWidth: 1.5,
              tension: 0.1,
              fill: false,
            },
            {
              label: 'OD MEAN',
              data: Array(n).fill(mean),
              borderColor: '#78716c',
              borderWidth: 1.5,
              pointRadius: 0,
              borderDash: [],
              fill: false,
            },
            {
              label: '+2 SD',
              data: Array(n).fill(mean + 2 * sd),
              borderColor: '#f97316',
              borderWidth: 1,
              pointRadius: 0,
              borderDash: [6, 3],
              fill: false,
            },
            {
              label: '-2 SD',
              data: Array(n).fill(mean - 2 * sd),
              borderColor: '#f97316',
              borderWidth: 1,
              pointRadius: 0,
              borderDash: [6, 3],
              fill: false,
            },
            {
              label: '+3 SD',
              data: Array(n).fill(mean + 3 * sd),
              borderColor: '#dc2626',
              borderWidth: 1.5,
              pointRadius: 0,
              borderDash: [],
              fill: false,
            },
            {
              label: '-3 SD',
              data: Array(n).fill(mean - 3 * sd),
              borderColor: '#dc2626',
              borderWidth: 1.5,
              pointRadius: 0,
              borderDash: [],
              fill: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 22,
                boxHeight: 2,
                padding: 12,
                font: { size: 11, family: "'Manrope', sans-serif" },
                color: '#374151',
              },
            },
            tooltip: { enabled: false },
            title: { display: false },
          },
          scales: {
            x: {
              ticks: {
                font: { size: 9, family: "'Manrope', sans-serif" },
                color: '#374151',
                maxRotation: 45,
                minRotation: 45,
                autoSkip: false,
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.05)',
              },
            },
            y: {
              title: {
                display: true,
                text: 'OD',
                font: { size: 12, weight: 600, family: "'Manrope', sans-serif" },
                color: '#374151',
              },
              ticks: {
                font: { size: 10, family: "'Manrope', sans-serif" },
                color: '#374151',
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.08)',
              },
            },
          },
        },
        plugins: [chartAreaBackground],
      };

      chartInstanceRef.current = new ChartJS(canvasRef.current, config);

      return () => {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
          chartInstanceRef.current = null;
        }
      };
    }, [chartData, mean, sd]);

    const chartTitle = `ANTI-${disease.toUpperCase()} IGM ${controlLabel.toUpperCase()} QC CHART ${year}`;
    const hasLotNumber = typeof lotNumber === 'string' && lotNumber.trim().length > 0;

    return (
      <div
        ref={ref}
        id="qc-printable-layout"
        style={{
          width: '1000px',
          backgroundColor: '#ffffff',
          padding: '32px',
          fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
          color: '#111827',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '12px',
            borderBottom: '1px solid #9ca3af',
          }}
        >
          <img
            src="/assets/zcmc-seal.png"
            alt="ZCMC Seal"
            width={80}
            height={80}
            style={{ objectFit: 'contain' }}
            crossOrigin="anonymous"
          />
          <div style={{ flex: 1, textAlign: 'center', padding: '0 16px' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', lineHeight: 1.3 }}>
              ZAMBOANGA CITY MEDICAL CENTER
            </div>
            <div style={{ fontWeight: 400, fontSize: '12px', lineHeight: 1.4 }}>
              Department of Pathology and Laboratory Medicine
            </div>
            <div style={{ fontWeight: 400, fontSize: '11px', lineHeight: 1.4 }}>
              Dr. D. Evangelista St. Sta. Catalina, 7000 Zamboanga City
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: '13px',
                marginTop: '8px',
                lineHeight: 1.3,
              }}
            >
              Vaccine Preventable Disease Referral Laboratory (VPDRL)
            </div>
            <div
              style={{
                fontWeight: 400,
                fontSize: '12px',
                letterSpacing: '0.08em',
                marginTop: '2px',
              }}
            >
              EIA QUALITY CONTROL GRAPH
            </div>
          </div>
          <img
            src="/assets/zcmc-pathology.png"
            alt="ZCMC Pathology"
            width={80}
            height={80}
            style={{ objectFit: 'contain' }}
            crossOrigin="anonymous"
          />
        </div>

        <div
          style={{
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '16px',
            margin: '12px 0',
            color: '#111827',
          }}
        >
          {chartTitle}
        </div>

        <div
          style={{
            textAlign: 'center',
            fontSize: '11px',
            color: '#4b5563',
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '12px',
          }}
        >
          <span>
            <strong>Mean:</strong> {mean.toFixed(4)}
          </span>
          <span>|</span>
          <span>
            <strong>SD:</strong> {sd.toFixed(4)}
          </span>
          <span>|</span>
          <span>
            <strong>CV%:</strong> {cv.toFixed(2)}%
          </span>
          <span>|</span>
          <span>
            <strong>Total Runs:</strong> {totalRuns}
          </span>
          {hasLotNumber && (
            <>
              <span>|</span>
              <span>
                <strong>Lot:</strong> {lotNumber}
              </span>
            </>
          )}
        </div>

        <div
          style={{
            width: '100%',
            height: '380px',
            backgroundColor: '#ffffff',
            position: 'relative',
          }}
        >
          {chartData.length > 0 ? (
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#9ca3af',
                fontSize: '13px',
              }}
            >
              No QC runs available for this control stream.
            </div>
          )}
        </div>

        <div
          style={{
            textAlign: 'center',
            fontSize: '10px',
            color: '#9ca3af',
            marginTop: '12px',
          }}
        >
          {`Generated by QC Pulse - VPDRL, ZCMC  |  ${formatGeneratedAt()}`}
          {controlType ? `  |  ${controlType.toUpperCase()}` : ''}
        </div>
      </div>
    );
  },
);

export default PrintableQCLayout;
