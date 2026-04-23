import { CheckCircleIcon, ShieldIcon, XCircleIcon } from '@phosphor-icons/react';
import type { QCRulesPanelProps } from '../../types/qc.types';

const RULE_LABELS = {
  '1_2s': '1-2s',
  '1_3s': '1-3s',
  '2_2s': '2-2s',
  R_4s: 'R-4s',
  '4_1s': '4-1s',
  '10x': '10x',
  '7T': '7T',
} as const;

const QCRulesPanel: React.FC<QCRulesPanelProps> = ({ qcRules }) => {
  const violatedCount = qcRules.filter(r => r.violated).length;
  const totalRules = qcRules.length;

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderColor: '#F3F3F3' }} className="rounded-xl shadow border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div style={{ background: '#0000FF' }} className="p-2 rounded-lg">
            <ShieldIcon className="text-white" size={20} />
          </div>
          <h3 className="text-xl font-bold" style={{ color: '#1A1C1C' }}>Westgard QC Rules</h3>
        </div>
        <div style={{ backgroundColor: '#F9F9F9', color: '#64748B' }} className="rounded-full px-4 py-1.5">
          <span className="text-sm font-semibold">
            {totalRules - violatedCount}/{totalRules} Passed
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {qcRules.map((rule, index) => (
          <div
            key={index}
            style={{
              backgroundColor: rule.violated
                ? rule.severity === 'warning'
                  ? 'rgba(217, 119, 6, 0.08)'
                  : 'rgba(178, 34, 34, 0.05)'
                : 'rgba(0, 0, 255, 0.05)',
              borderColor: rule.violated
                ? rule.severity === 'warning'
                  ? '#D97706'
                  : '#B22222'
                : '#0000FF'
            }}
            className="p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
          >
            <div className="flex items-start justify-between mb-2">
              <div
                style={{
                  color: rule.violated
                    ? rule.severity === 'warning'
                      ? '#D97706'
                      : '#B22222'
                    : '#0000FF'
                }}
                className="font-bold text-base"
              >
                {RULE_LABELS[rule.name]}
              </div>
              {rule.violated ? (
                <XCircleIcon style={{ color: rule.severity === 'warning' ? '#D97706' : '#B22222' }} className="flex-shrink-0" size={20} />
              ) : (
                <CheckCircleIcon style={{ color: '#0000FF' }} className="flex-shrink-0" size={20} />
              )}
            </div>
            <div
              style={{
                color: rule.violated
                  ? rule.severity === 'warning'
                    ? '#D97706'
                    : '#B22222'
                  : '#0000FF'
              }}
              className="text-sm leading-relaxed mb-3"
            >
              {rule.description}
            </div>
            <div style={{
              backgroundColor: rule.violated
                ? rule.severity === 'warning'
                  ? 'rgba(217, 119, 6, 0.18)'
                  : 'rgba(178, 34, 34, 0.2)'
                : 'rgba(0, 0, 255, 0.2)',
              color: rule.violated
                ? rule.severity === 'warning'
                  ? '#D97706'
                  : '#B22222'
                : '#0000FF'
            }} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold">
              {rule.violated ? (
                <>
                  <XCircleIcon size={12} />
                  {rule.severity === 'warning' ? 'WARNING' : 'VIOLATED'}
                </>
              ) : (
                <>
                  <CheckCircleIcon size={12} />
                  PASSED
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QCRulesPanel;
