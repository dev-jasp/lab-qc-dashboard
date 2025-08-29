import { ChartDataPoint, QCStatistics, QCParameters, QCRule } from '../types/qc.types';
import { DEFAULT_QC_RULES } from '../constants/qc-rules';

export const calculateStatistics = (data: ChartDataPoint[]): QCStatistics => {
  if (data.length === 0) {
    return { mean: 0, sd: 0, sampleCount: 0 };
  }

  const values = data.map(d => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  
  if (values.length === 1) {
    return { mean, sd: 0, sampleCount: 1 };
  }

  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length - 1);
  const sd = Math.sqrt(variance);
  
  return {
    mean,
    sd,
    sampleCount: data.length
  };
};

export const evaluateQCRules = (
  data: ChartDataPoint[], 
  statistics: QCStatistics, 
  parameters: QCParameters
): QCRule[] => {
  const rules: QCRule[] = DEFAULT_QC_RULES.map(rule => ({
    ...rule,
    violated: false
  }));

  if (data.length < 2) return rules;

  const values = data.map(d => d.value);
  const mean = statistics.mean || parameters.targetMean;
  const sd = statistics.sd || parameters.targetSD;

  // 1-3s rule: One control exceeds ±3SD
  rules[0].violated = values.some(val => Math.abs(val - mean) > 3 * sd);

  // 2-2s rule: Two consecutive controls exceed ±2SD on same side
  for (let i = 1; i < values.length; i++) {
    const curr = (values[i] - mean) / sd;
    const prev = (values[i-1] - mean) / sd;
    if ((curr > 2 && prev > 2) || (curr < -2 && prev < -2)) {
      rules[1].violated = true;
      break;
    }
  }

  // R-4s rule: Range between consecutive controls > 4SD
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i] - values[i-1]) > 4 * sd) {
      rules[2].violated = true;
      break;
    }
  }

  // 4-1s rule: Four consecutive controls exceed ±1SD on same side
  if (values.length >= 4) {
    for (let i = 3; i < values.length; i++) {
      const last4 = values.slice(i-3, i+1);
      const allPositive = last4.every(val => (val - mean) / sd > 1);
      const allNegative = last4.every(val => (val - mean) / sd < -1);
      if (allPositive || allNegative) {
        rules[3].violated = true;
        break;
      }
    }
  }

  return rules;
};

export const calculateZScore = (value: number, mean: number, sd: number): number => {
  return (value - mean) / sd;
};

export const getPointColor = (zScore: number): string => {
  const absZScore = Math.abs(zScore);
  if (absZScore > 3) return '#dc2626'; // Red for >3SD
  if (absZScore > 2) return '#f59e0b'; // Orange for >2SD
  if (absZScore > 1) return '#eab308'; // Yellow for >1SD
  return '#16a34a'; // Green for within 1SD
};