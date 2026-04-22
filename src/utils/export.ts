import type { QCEntry, QCStatistics, QCParameters } from '../types/qc.types';
import { calculateZScore } from './qc-calculations';

const escapeCSVCell = (value: string): string => `"${value.replace(/"/g, '""')}"`;

export const exportToCSV = (
  entries: QCEntry[],
  statistics: QCStatistics, 
  parameters: QCParameters
): void => {
  const mean = statistics.mean || parameters.targetMean;
  const sd = statistics.sd || parameters.targetSD;

  const csv = [
    ['Date', 'Protocol No.', 'OD Value', 'Lot Number', 'Run Number', 'Vial Number', 'Remarks', 'Z-Score'],
    ...entries.map((entry) => {
      const zScore = calculateZScore(entry.odValue, mean, sd).toFixed(3);
      return [
        entry.date,
        entry.protocolNumber,
        entry.odValue.toFixed(4),
        entry.lotNumber,
        entry.runNumber,
        entry.vialNumber,
        entry.notes ?? '',
        zScore,
      ];
    })
  ].map((row) => row.map((cell) => escapeCSVCell(String(cell))).join(',')).join('\n');

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
