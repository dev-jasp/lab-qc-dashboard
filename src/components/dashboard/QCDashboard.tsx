import React, { useState } from 'react';
import { Download } from 'lucide-react';
import type { ChartDataPoint, QCParameters } from '../../types/qc.types';
import { useQCLogic } from '../../hooks/useQCLogic';
import { useToast } from '../../hooks/useToast';
import { exportToCSV, validateODValue } from '../../utils/export';
import { DEFAULT_PARAMETERS, SAMPLE_DATA } from '../../constants/qc-rules';

import { DashboardHeader } from '../layout/DashboardHeader';
import Footer from '../layout/Footer';
import InputPanel from '../panels/InputPanel';
import QCRulesPanel from '../panels/QCRulesPanel';
import StatisticsPanel from '../panels/StatisticsPanel';
import LeveyJenningsChart from '../chart/LeveyJenningsChart';
import { ToastContainer } from '../ui/Toast';

interface QCDashboardProps {
  diseaseName?: string;
  controlName?: string;
  assayTag?: string;
  initialData?: ChartDataPoint[];
  initialParameters?: QCParameters;
}

const QCDashboard: React.FC<QCDashboardProps> = ({
  diseaseName,
  controlName,
  assayTag,
  initialData = SAMPLE_DATA,
  initialParameters = DEFAULT_PARAMETERS,
}) => {
  const [data, setData] = useState<ChartDataPoint[]>(initialData);
  const [newOD, setNewOD] = useState<string>('');
  const [protocolNo, setProtocolNo] = useState<string>('');
  const [parameters, setParameters] = useState<QCParameters>(initialParameters);
  const { toasts, removeToast, success, error, warning } = useToast();

  const { statistics, qcRules, hasViolations } = useQCLogic(data, parameters);
  const lastOD = data.length > 0 ? data[data.length - 1] : null;

  const addODValue = (): void => {
    const trimmedProtocolNo = protocolNo.trim();

    if (!trimmedProtocolNo) {
      error('Protocol No. is required');
      return;
    }

    const validation = validateODValue(newOD);
    
    if (!validation.isValid) {
      error(validation.error || 'Invalid OD value');
      return;
    }

    const odValue = parseFloat(newOD);
    const newPoint: ChartDataPoint = {
      sample: trimmedProtocolNo,
      value: odValue,
      timestamp: new Date().toISOString().split('T')[0]
    };

    setData(prevData => [...prevData, newPoint]);
    setNewOD('');
    setProtocolNo('');
    success(`OD value ${odValue.toFixed(3)} added successfully`);
  };

  const clearData = (): void => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      setData([]);
      warning('All data has been cleared');
    }
  };

  const handleExport = (): void => {
    if (data.length === 0) {
      error('No data to export');
      return;
    }
    exportToCSV(data, statistics, parameters);
    success('Data exported successfully');
  };

  const sum = data.reduce((total, point) => total + point.value, 0);
  const cv = statistics.mean > 0 ? (statistics.sd / statistics.mean) * 100 : 0;
  const confidence = data.length === 0
    ? 0
    : statistics.sd === 0
      ? 100
      : (data.filter((point) => Math.abs(point.value - statistics.mean) <= 2 * statistics.sd).length / data.length) * 100;

  const runStatistics = {
    mean: statistics.mean,
    sd: statistics.sd,
    sum,
    cv,
    lastOD: lastOD?.value ?? null,
    totalRuns: data.length,
    confidence
  };

  const monitorTitle = diseaseName && controlName
    ? `${diseaseName} ${controlName}`
    : 'Quality Control Monitor';
  const monitorSubtitle = diseaseName && controlName
    ? `${controlName.toUpperCase()} • ${diseaseName.toUpperCase()}${assayTag ? ` • ${assayTag}` : ''}`
    : 'REAL-TIME LEVEY-JENNINGS ANALYSIS • LOT #XC-9021';

  return (
    <div style={{ backgroundColor: '#F9F9F9' }} className="min-h-screen">
      <DashboardHeader activeTab="monitor" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#1A1C1C' }}>{monitorTitle}</h1>
          {diseaseName && controlName && (
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>
              {monitorSubtitle}
            </p>
          )}
          <p className={diseaseName && controlName ? 'hidden' : 'text-sm mt-1'} style={{ color: '#64748B' }}>
            REAL-TIME LEVEY-JENNINGS ANALYSIS • LOT #XC-9021
          </p>
        </div>

        {/* Status Overview */}
        <div className="hidden">
          <div style={{ backgroundColor: '#FFFFFF', borderColor: '#F3F3F3' }} className="rounded-xl shadow border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div style={{ backgroundColor: hasViolations ? '#B22222' : '#0000FF' }} className="w-2 h-2 rounded-full"></div>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Current Status</span>
            </div>
            <div style={{ color: hasViolations ? '#B22222' : '#0000FF' }} className="text-lg font-bold">
              {hasViolations ? 'OUT OF CONTROL' : 'NORMAL'}
            </div>
            <p className="text-xs mt-2" style={{ color: '#64748B' }}>
              {hasViolations 
                ? 'Violations detected in the last 24 cycles.' 
                : 'System operating within 1SD. No violations detected in the last 24 cycles.'}
            </p>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderColor: '#F3F3F3' }} className="hidden rounded-xl shadow border p-4">
            <span className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: '#64748B' }}>Last Recorded OD</span>
            <div style={{ color: '#0000FF' }} className="text-3xl font-bold">
              {lastOD ? lastOD.value.toFixed(3) : '—'}
            </div>
            {lastOD && (
              <p className="text-xs mt-2" style={{ color: '#64748B' }}>Timestamp: {lastOD.timestamp}</p>
            )}
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderColor: '#F3F3F3' }} className="hidden rounded-xl shadow border p-4">
            <span className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: '#64748B' }}>Mean</span>
            <div style={{ color: '#1A1C1C' }} className="text-2xl font-bold">{statistics.mean.toFixed(3)}</div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderColor: '#F3F3F3' }} className="hidden rounded-xl shadow border p-4">
            <span className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: '#64748B' }}>SD</span>
            <div style={{ color: '#1A1C1C' }} className="text-2xl font-bold">{statistics.sd.toFixed(3)}</div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderColor: '#F3F3F3' }} className="hidden rounded-xl shadow border p-4">
            <span className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: '#64748B' }}>Confidence</span>
            <div style={{ color: '#0000FF' }} className="text-2xl font-bold">{cv}%</div>
          </div>
        </div>

        {/* Top Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8 items-stretch">
          <div className="h-full">
            <InputPanel
              newOD={newOD}
              setNewOD={setNewOD}
              protocolNo={protocolNo}
              setProtocolNo={setProtocolNo}
              onAddOD={addODValue}
              parameters={parameters}
              onParametersChange={setParameters}
              onExport={handleExport}
              onClear={clearData}
            />
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderColor: '#F3F3F3' }} className="rounded-xl shadow border p-5 h-full flex flex-col">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>
                  Current Status
                </p>
                <div style={{ color: hasViolations ? '#B22222' : '#0000FF' }} className="text-2xl font-bold mt-1">
                  {hasViolations ? 'OUT OF CONTROL' : 'NORMAL'}
                </div>
              </div>
              <div
                style={{ backgroundColor: hasViolations ? '#B22222' : '#0000FF' }}
                className="w-3 h-3 rounded-full shrink-0 mt-1"
              ></div>
            </div>

            <p className="text-sm leading-6" style={{ color: '#64748B' }}>
              {hasViolations
                ? 'Violations detected in the latest review window. Inspect the run details before proceeding.'
                : 'System is operating within expected control limits. No recent Westgard violations detected.'}
            </p>

            <div className="grid grid-cols-3 gap-3 mt-5">
              <div style={{ backgroundColor: '#F9F9F9', borderColor: '#F3F3F3' }} className="rounded-lg border p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>
                  Last OD
                </p>
                <p className="text-lg font-bold mt-1" style={{ color: '#1A1C1C' }}>
                  {lastOD ? lastOD.value.toFixed(3) : '-'}
                </p>
              </div>
              <div style={{ backgroundColor: '#F9F9F9', borderColor: '#F3F3F3' }} className="rounded-lg border p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>
                  Runs
                </p>
                <p className="text-lg font-bold mt-1" style={{ color: '#1A1C1C' }}>
                  {data.length}
                </p>
              </div>
              <div style={{ backgroundColor: '#F9F9F9', borderColor: '#F3F3F3' }} className="rounded-lg border p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>
                  CV
                </p>
                <p className="text-lg font-bold mt-1" style={{ color: '#1A1C1C' }}>
                  {cv.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <StatisticsPanel runStatistics={runStatistics} />
        </div>

        <div className="mb-8">
          <LeveyJenningsChart
            data={data}
            statistics={statistics}
            parameters={parameters}
          />
        </div>

        {/* Chart Controls */}
        <div className="flex gap-3 mb-8">
          <button 
            onClick={handleExport}
            style={{ borderColor: '#F3F3F3', color: '#64748B' }}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            <Download size={16} />
            Download Report
          </button>
          <button style={{ borderColor: '#F3F3F3', color: '#64748B' }} className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-gray-100 transition-colors">
            DAILY
          </button>
          <button style={{ borderColor: '#F3F3F3', color: '#64748B' }} className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-gray-100 transition-colors">
            WEEKLY
          </button>
        </div>

        {/* Westgard Rules Panel */}
        <div className="mb-8">
          <QCRulesPanel qcRules={qcRules} />
        </div>

        {/* Recent Logs */}
        <div style={{ backgroundColor: '#FFFFFF', borderColor: '#F3F3F3' }} className="rounded-xl shadow border p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#1A1C1C' }}>Recent Logs</h3>
          <div className="space-y-3">
            {data.slice(-5).reverse().map((entry, idx) => (
              <div key={idx} style={{ borderBottomColor: '#F3F3F3' }} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium" style={{ color: '#1A1C1C' }}>{entry.timestamp}</p>
                  <p className="text-xs" style={{ color: '#64748B' }}>Protocol No. {entry.sample}</p>
                </div>
                <div className="text-sm font-semibold" style={{ color: '#1A1C1C' }}>{entry.value.toFixed(3)}</div>
              </div>
            ))}
          </div>
        </div>

        <Footer />
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default QCDashboard;
