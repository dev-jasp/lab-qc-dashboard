import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { StatisticsPanelProps } from '../../types/qc.types';

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ statistics, hasViolations }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Statistics</h3>
      
      <div className="space-y-3">
        <div className="bg-blue-50 rounded-lg p-3 transition-colors hover:bg-blue-100">
          <div className="text-sm text-blue-600 font-medium">Current Mean</div>
          <div className="text-2xl font-bold text-blue-800">{statistics.mean.toFixed(3)}</div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-3 transition-colors hover:bg-purple-100">
          <div className="text-sm text-purple-600 font-medium">Current SD</div>
          <div className="text-2xl font-bold text-purple-800">{statistics.sd.toFixed(3)}</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3 transition-colors hover:bg-gray-100">
          <div className="text-sm text-gray-600 font-medium">Total Samples</div>
          <div className="text-2xl font-bold text-gray-800">{statistics.sampleCount}</div>
        </div>

        <div className={`${hasViolations ? 'bg-red-50 hover:bg-red-100' : 'bg-green-50 hover:bg-green-100'} rounded-lg p-3 transition-colors`}>
          <div className={`text-sm font-medium flex items-center gap-2 ${hasViolations ? 'text-red-600' : 'text-green-600'}`}>
            {hasViolations ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
            QC Status
          </div>
          <div className={`text-lg font-bold ${hasViolations ? 'text-red-800' : 'text-green-800'}`}>
            {hasViolations ? 'Out of Control' : 'In Control'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPanel;