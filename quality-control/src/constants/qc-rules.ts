import type { QCRule } from '../types/qc.types';

export const DEFAULT_QC_RULES: Omit<QCRule, 'violated'>[] = [
  { 
    name: "1-3s", 
    description: "One control exceeds ±3SD" 
  },
  { 
    name: "2-2s", 
    description: "Two consecutive controls exceed ±2SD on same side" 
  },
  { 
    name: "R-4s", 
    description: "Range between consecutive controls > 4SD" 
  },
  { 
    name: "4-1s", 
    description: "Four consecutive controls exceed ±1SD on same side" 
  }
];

export const DEFAULT_PARAMETERS = {
  targetMean: 2.15,
  targetSD: 0.05
};

export const SAMPLE_DATA = [
  { sample: "1", value: 2.15, timestamp: "2024-01-01" },
  { sample: "2", value: 2.08, timestamp: "2024-01-02" },
  { sample: "3", value: 2.22, timestamp: "2024-01-03" },
  { sample: "4", value: 2.12, timestamp: "2024-01-04" },
  { sample: "5", value: 2.18, timestamp: "2024-01-05" }
];