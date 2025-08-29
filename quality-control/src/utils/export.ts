import { ChartDataPoint, QCStatistics, QCParameters } from '../types/qc.types';
import { calculateZScore } from './qc-calculations';

export const exportToCSV = (
  data: ChartDataPoint[], 
  statistics: QCStatistics, 
  parameters: QCParameters
): void => {
  const mean = statistics.mean || parameters.targetMean;
  const sd = statistics.sd || parameters.targetSD;

  const csv = [
    ['Sample', 'OD Value', 'Date', 'Z-Score'],
    ...data.map(d => {
      const zScore = calculateZScore(d.value, mean, sd).toFixed(3);
      return [d.sample, d.value, d.timestamp, zScore];
    })
  ].map(row => row.join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `qc-data-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const validateODValue = (value: string): { isValid: boolean; error?: string } => {
  const numValue = parseFloat(value);
  
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Please enter a valid numeric OD value' };
  }
  
  if (numValue < 0) {
    return { isValid: false, error: 'OD value cannot be negative' };
  }
  
  if (numValue > 10) {
    return { isValid: false, error: 'OD value seems unusually high (>10)' };
  }
  
  return { isValid: true };
};