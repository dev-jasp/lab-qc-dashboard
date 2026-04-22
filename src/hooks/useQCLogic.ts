import { useMemo } from 'react';
import type { ChartDataPoint, QCParameters } from '../types/qc.types';
import { calculateStatistics, evaluateCVTrend, evaluateQCRules } from '../utils/qc-calculations';

export const useQCLogic = (data: ChartDataPoint[], parameters: QCParameters) => {
  const statistics = useMemo(() => calculateStatistics(data), [data]);

  const qcRules = useMemo(
    () => evaluateQCRules(data, statistics, parameters),
    [data, statistics, parameters]
  );

  const cvTrend = useMemo(() => evaluateCVTrend(data), [data]);

  const hasViolations = useMemo(
    () => qcRules.some((rule) => rule.violated),
    [qcRules]
  );

  return {
    statistics,
    qcRules,
    cvTrend,
    hasViolations
  };
};
