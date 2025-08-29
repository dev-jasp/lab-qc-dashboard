import { useState, useEffect } from 'react';
import type { ChartDataPoint, QCParameters, QCStatistics, QCRule } from '../types/qc.types';
import { calculateStatistics, evaluateQCRules } from '../utils/qc-calculations';

export const useQCLogic = (data: ChartDataPoint[], parameters: QCParameters) => {
  const [statistics, setStatistics] = useState<QCStatistics>({
    mean: 0,
    sd: 0,
    sampleCount: 0
  });
  const [qcRules, setQcRules] = useState<QCRule[]>([]);
  const [hasViolations, setHasViolations] = useState(false);

  // Calculate statistics when data changes
  useEffect(() => {
    const newStats = calculateStatistics(data);
    setStatistics(newStats);
  }, [data]);

  // Evaluate QC rules when data or parameters change
  useEffect(() => {
    const rules = evaluateQCRules(data, statistics, parameters);
    setQcRules(rules);
    setHasViolations(rules.some(rule => rule.violated));
  }, [data, statistics, parameters]);

  return {
    statistics,
    qcRules,
    hasViolations
  };
};