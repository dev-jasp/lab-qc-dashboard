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
  /** Human-readable name, kept for exports and print output. */
  performedBy: string | null;
  /** Joins to StaffMember.id. Null on legacy and seeded entries. */
  performedById: string | null;
  /**
   * The colleague who attested the run was performed properly, transcribed
   * from the bench worksheet.
   *
   * NOT the same as `signedBy`, which is an in-app attestation that also locks
   * the record from editing. A validator is a recorded fact and locks nothing.
   * Null on entries recorded before the field existed.
   */
  validatedBy: string | null;
  /** Joins to StaffMember.id. Null on entries predating the field. */
  validatedById: string | null;
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
  /** Display name of the selected staff member, mirrored for storage. */
  performedBy: string;
  /** Selected StaffMember.id. Empty string when nobody is selected yet. */
  performedById: string;
  /** Display name of the attesting colleague, mirrored for storage. */
  validatedBy: string;
  /** Selected StaffMember.id. Empty string when nobody is selected yet. */
  validatedById: string;
};

export type LotMetadata = {
  lotNumber: string;
  startDate: string;
  endDate: string | null;
  expiryDate: string | null;
  status: 'active' | 'archived';
  notes: string | null;
};

export type InHouseBatchMetadata = {
  batchId: string;
  startDate: string;
  endDate: string | null;
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
  /** Days before a reagent lot's expiry date that it starts appearing on the lot watchlist. */
  lotExpiryWarningDays: number;
};

/**
 * A roster designation, NOT an access-control role.
 *
 * Access control lives in src/lib/auth.ts, which has its own capitalised
 * `UserRole`. Staff records and login accounts are deliberately separate: a
 * bench technician may have no login, and an account holder may record no runs.
 * Do not try to join these two vocabularies.
 */
export type StaffRole = 'analyst' | 'supervisor' | 'admin';

/**
 * The shift a person is normally rostered on. `rotating` covers staff who move
 * between shifts rather than holding a fixed one.
 */
export type DutyShift = 'morning' | 'mid' | 'night' | 'rotating';

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** A member of lab personnel who can be attributed to a QC run. */
export type StaffMember = {
  id: string;
  /** Lab or employee identifier. Unique, compared case-insensitively. */
  staffId: string;
  displayName: string;
  /** Defaulted from displayName, then editable. */
  initials: string;
  role: StaffRole;
  /** Stored as typed; the roster is a directory, not a dialler. */
  contactNumber: string | null;
  email: string | null;
  /** Portrait path or data URI. Null falls back to the initials avatar. */
  photoUrl: string | null;
  shift: DutyShift;
  /** Weekdays normally worked. Empty when the person has no fixed days. */
  dutyDays: Weekday[];
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
};

// Component prop types
export interface LeveyJenningsChartProps {
  data: ChartDataPoint[];
  statistics: QCStatistics;
  parameters: QCParameters;
  title?: string;
  height?: number;
  badgeLabel?: string;
  showBadge?: boolean;
  headerActions?: React.ReactNode;
  showChartTitle?: boolean;
  variant?: 'card' | 'plain';
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
