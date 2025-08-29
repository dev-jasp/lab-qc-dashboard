import React from 'react';
import type { QCRulesPanelProps } from '../../types/qc.types';

const QCRulesPanel: React.FC<QCRulesPanelProps> = ({ qcRules }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Westgard QC Rules</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {qcRules.map((rule, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border-l-4 transition-all hover:shadow-md ${
              rule.violated
                ? 'bg-red-50 border-red-500 hover:bg-red-100'
                : 'bg-green-50 border-green-500 hover:bg-green-100'
            }`}
          >
            <div className={`font-semibold ${rule.violated ? 'text-red-800' : 'text-green-800'}`}>
              {rule.name}
            </div>
            <div className={`text-sm ${rule.violated ? 'text-red-600' : 'text-green-600'}`}>
              {rule.description}
            </div>
            <div className={`text-xs mt-1 font-medium ${rule.violated ? 'text-red-700' : 'text-green-700'}`}>
              {rule.violated ? 'VIOLATED' : 'PASSED'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QCRulesPanel;