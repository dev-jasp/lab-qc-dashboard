import React, { useState } from 'react';
import { ChartDataPoint, QCParameters } from '../../types/qc.types';
import { useQCLogic } from '../../hooks/useQCLogic';
import { exportToCSV, validateODValue } from '../../utils/export';
import { DEFAULT_PARAMETERS, SAMPLE_DATA } from '../../constants/qc-rules';

// Component imports
import DashboardHeader from '../layout/DashboardHeader';
import InputPanel from '../panels/InputPanel';
import StatisticsPanel from '../panels/StatisticsPanel';
import QCRulesPanel from '../panels/QCRulesPanel';
import LeveyJenningsChart from '../chart/LeveyJenningsChart';

const QCDashboard: React.FC = () => {
  const [data, setData] = useState<ChartDataPoint[]>(SAMPLE_DATA);
  const [newOD, setNewOD] = useState<string>('');
  const [parameters, setParameters] = useState<QCParameters>(DEFAULT_PARAMETERS);

  const { statistics, qcRules, hasViolations } = useQCLogic(data, parameters);

  const addODValue = (): void => {
    const validation = validateODValue(newOD);
    
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    const odValue = parseFloat(newOD);
    const newPoint: ChartDataPoint = {
      sample: (data.length + 1).toString(),
      value: odValue,
      timestamp: new Date().toISOString().split('T')[0]
    };

    setData(prevData => [...prevData, newPoint]);
    setNewOD('');
  };

  const clearData = (): void => {
    if (confirm('Are you sure you want to clear all data?')) {
      setData([]);
    }
  };

  const handleExport = (): void => {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }
    exportToCSV(data, statistics, parameters);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader />

        {/* Control Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div className="lg:col-span-1">
            <InputPanel
              newOD={newOD}
              setNewOD={setNewOD}
              onAddOD={addODValue}
              parameters={parameters}
              onParametersChange={setParameters}
              onExport={handleExport}
              onClear={clearData}
            />
          </div>

          <div className="lg:col-span-1">
            <StatisticsPanel
              statistics={statistics}
              hasViolations={hasViolations}
            />
          </div>

          <div className="lg:col-span-2">
            <QCRulesPanel qcRules={qcRules} />
          </div>
        </div>

        {/* Chart */}
        <LeveyJenningsChart
          data={data}
          statistics={statistics}
          parameters={parameters}
        />
      </div>
    </div>
  );
};

export default QCDashboard;