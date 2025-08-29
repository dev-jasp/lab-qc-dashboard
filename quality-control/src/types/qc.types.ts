// data types
export interface ChartDataPoint {
  sample: string;
  value: number;
  timestamp: string;
}

export interface QCRule {
  name: string;
  violated: boolean;
  description: string;
}

export interface QCStatistics {
  mean: number;
  sd: number;
  sampleCount: number;
}

export interface QCParameters {
  targetMean: number;
  targetSD: number;
}

// Component prop types
export interface LeveyJenningsChartProps {
  data: ChartDataPoint[];
  statistics: QCStatistics;
  parameters: QCParameters;
}

export interface InputPanelProps {
  newOD: string;
  setNewOD: (value: string) => void;
  onAddOD: () => void;
  parameters: QCParameters;
  onParametersChange: (params: QCParameters) => void;
  onExport: () => void;
  onClear: () => void;
}

export interface StatisticsPanelProps {
  statistics: QCStatistics;
  hasViolations: boolean;
}

export interface QCRulesPanelProps {
  qcRules: QCRule[];
}

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface InputProps {
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'email' | 'password';
  placeholder?: string;
  step?: string;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}