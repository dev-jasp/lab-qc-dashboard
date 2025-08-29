interface ChartDataPoint {
  sample: string;
  value: number;
  timestamp: string;
}

interface QCRule {
  name: string;
  violated: boolean;
  description: string;
}

interface QCStatistics {
  mean: number;
  sd: number;
  sampleCount: number;
}

interface QCParameters {
  targetMean: number;
  targetSD: number;
}