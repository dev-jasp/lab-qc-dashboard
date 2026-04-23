// data types
export interface ChartDataPoint {
  sample: string;
  value: number;
  timestamp: string;
  isEdited?: boolean;
  isFlagged?: boolean;
  isViolation?: boolean;
}

export interface QCRule {
  name: WestgardRule;
  violated: boolean;
  description: string;
  severity?: 'warning' | 'rejection';
  status?: 'passed' | 'violated' | 'insufficient_data';
  triggeringIndices?: number[];
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

export type RunStatisticsSummary = {
  mean: number;
  sd: number;
  sum: number;
  cv: number;
  lastOD: number | null;
  totalRuns: number;
  confidence: number;
};

export type DiseaseSlug =
  | 'measles'
  | 'rubella'
  | 'rotavirus'
  | 'japanese-encephalitis'
  | 'dengue';

export type ControlTypeSlug = 'in-house-control' | 'positive-control' | 'negative-control';

export type WestgardRule = '1_2s' | '1_3s' | '2_2s' | 'R_4s' | '4_1s' | '10x' | '7T';

export type QCEntryFlag =
  | 'reagent_reconstituted'
  | 'new_operator'
  | 'equipment_maintenance'
  | 'repeat_test'
  | 'reagent_thawed'
  | 'instrument_calibrated'
  | 'anomalous_result'
  | 'corrective_repeat'
  | 'other';

export type CorrectiveRootCause =
  | 'reagent_issue'
  | 'instrument_malfunction'
  | 'operator_error'
  | 'sample_issue'
  | 'environmental_factor'
  | 'unexplained'
  | 'other';

export type CorrectiveAction = {
  rootCause: CorrectiveRootCause;
  rootCauseDetails: string | null;
  actionTaken: string;
  preventiveAction: string | null;
  repeatTestPerformed: boolean;
  repeatODValue: number | null;
  repeatProtocolNumber: string | null;
  outcome: 'resolved' | 'ongoing' | 'escalated';
  acknowledgedBy: string;
  acknowledgedAt: string;
};

export type QCEntry = {
  id: string;
  date: string;
  protocolNumber: string;
  odValue: number;
  lotNumber: string;
  controlCode: string;
  runNumber: string;
  vialNumber: string;
  flag: QCEntryFlag | null;
  notes: string | null;
  editedAt: string | null;
  editReason: string | null;
  signedBy: string | null;
  signedAt: string | null;
};

export type EntryFormValues = {
  date: string;
  odValue: string;
  protocolNumber: string;
  remarks: string;
};

export type LotMetadata = {
  lotNumber: string;
  startDate: string;
  endDate: string | null;
  expiryDate: string | null;
  status: 'active' | 'archived';
  notes: string | null;
};

export type ViolationEntry = {
  id: string;
  timestamp: string;
  ruleName: WestgardRule;
  severity: 'rejection' | 'warning';
  triggeringProtocols: string[];
  triggeringODValues: number[];
  lotNumber: string;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  correctiveAction: CorrectiveAction | null;
};

export type AuditEntry = {
  id: string;
  timestamp: string;
  action: 'EDIT' | 'DELETE';
  performedBy: string;
  originalValues: QCEntry;
  newValues: QCEntry | null;
  reason: string;
};

export type QCSettings = {
  labName: string;
  labSection: string;
  labAddress: string;
  defaultPreparedBy: string;
  defaultValidatedBy: string;
  cvAlertThreshold: number;
  minDataPointsForWestgard: number;
  dateFormat: 'YYYY-MM-DD';
  recentLogsCount: number;
  chartTheme: 'light' | 'dark';
  defaultChartView: 'daily' | 'weekly' | 'monthly';
};

export type QCUserRole = 'analyst' | 'supervisor' | 'admin';

export type QCUser = {
  id: string;
  username: string;
  displayName: string;
  role: QCUserRole;
  pinHash: string;
  createdAt: string;
  updatedAt: string | null;
  lastLoginAt: string | null;
  isActive: boolean;
};

export type QCSession = {
  userId: string;
  username: string;
  displayName: string;
  role: QCUserRole;
  startedAt: string;
  lastActivityAt: string;
  expiresAt: string;
};

// Component prop types
export interface LeveyJenningsChartProps {
  data: ChartDataPoint[];
  statistics: QCStatistics;
  parameters: QCParameters;
  title?: string;
  height?: number;
  badgeLabel?: string;
  headerActions?: React.ReactNode;
  showChartTitle?: boolean;
  variant?: 'card' | 'plain';
}

export interface InputPanelProps {
  formValues: EntryFormValues;
  onFieldChange: (field: keyof EntryFormValues, value: string) => void;
  onAddOD: () => void;
  currentLotNumber?: string;
  isReadOnly?: boolean;
}

export interface StatisticsPanelProps {
  runStatistics: RunStatisticsSummary;
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
