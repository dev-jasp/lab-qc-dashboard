import type {
  AuditEntry,
  CorrectiveAction,
  LotMetadata,
  QCEntry,
  QCSettings,
  QCUser,
  ViolationEntry,
} from '@/types/qc.types';

const STORAGE_PREFIX = 'qc_';
const STORAGE_INDEX_KEY = '__qc_storage_index__';
const SETTINGS_KEY = 'qc_settings';
const USERS_KEY = 'qc_users';
const LOGO_KEYS = {
  seal: 'qc_logo_seal',
  pathology: 'qc_logo_pathology',
} as const;

const DEFAULT_SETTINGS: QCSettings = {
  labName: 'Zamboanga City Medical Center',
  labSection: 'Vaccine Preventable Disease Referral Laboratory (VPDRL)',
  labAddress: 'Dr. D. Evangelista St. Sta. Catalina, 7000 Zamboanga City',
  defaultPreparedBy: '',
  defaultValidatedBy: '',
  cvAlertThreshold: 15,
  minDataPointsForWestgard: 10,
  dateFormat: 'YYYY-MM-DD',
  recentLogsCount: 10,
  chartTheme: 'light',
  defaultChartView: 'daily',
};

type StoredBackup = Record<string, unknown>;
type StorageMutation = {
  key: string;
  value: unknown;
};

const ENTRY_FLAGS = new Set([
  'reagent_reconstituted',
  'new_operator',
  'equipment_maintenance',
  'repeat_test',
  'reagent_thawed',
  'instrument_calibrated',
  'anomalous_result',
  'corrective_repeat',
  'other',
]);

const RULE_NAMES = new Set(['1_2s', '1_3s', '2_2s', 'R_4s', '4_1s', '10x', '7T']);
const LOT_STATUSES = new Set(['active', 'archived']);
const VIOLATION_SEVERITIES = new Set(['rejection', 'warning']);
const CORRECTIVE_ROOT_CAUSES = new Set([
  'reagent_issue',
  'instrument_malfunction',
  'operator_error',
  'sample_issue',
  'environmental_factor',
  'unexplained',
  'other',
]);
const CORRECTIVE_OUTCOMES = new Set(['resolved', 'ongoing', 'escalated']);
const AUDIT_ACTIONS = new Set(['EDIT', 'DELETE']);
const USER_ROLES = new Set(['analyst', 'supervisor', 'admin']);
const CHART_THEMES = new Set(['light', 'dark']);
const CHART_VIEWS = new Set(['daily', 'weekly', 'monthly']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isNumber);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isNumber(value);
}

function isQCEntry(value: unknown): value is QCEntry {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.date) &&
    isString(value.protocolNumber) &&
    isNumber(value.odValue) &&
    isString(value.lotNumber) &&
    isString(value.controlCode) &&
    isString(value.runNumber) &&
    isString(value.vialNumber) &&
    (value.flag === null || (isString(value.flag) && ENTRY_FLAGS.has(value.flag))) &&
    isNullableString(value.notes) &&
    isNullableString(value.editedAt) &&
    isNullableString(value.editReason) &&
    isNullableString(value.signedBy) &&
    isNullableString(value.signedAt)
  );
}

function isLotMetadata(value: unknown): value is LotMetadata {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.lotNumber) &&
    isString(value.startDate) &&
    isNullableString(value.endDate) &&
    isNullableString(value.expiryDate) &&
    isString(value.status) &&
    LOT_STATUSES.has(value.status) &&
    isNullableString(value.notes)
  );
}

function isCorrectiveAction(value: unknown): value is CorrectiveAction {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.rootCause) &&
    CORRECTIVE_ROOT_CAUSES.has(value.rootCause) &&
    isNullableString(value.rootCauseDetails) &&
    isString(value.actionTaken) &&
    isNullableString(value.preventiveAction) &&
    isBoolean(value.repeatTestPerformed) &&
    isNullableNumber(value.repeatODValue) &&
    isNullableString(value.repeatProtocolNumber) &&
    isString(value.outcome) &&
    CORRECTIVE_OUTCOMES.has(value.outcome) &&
    isString(value.acknowledgedBy) &&
    isString(value.acknowledgedAt)
  );
}

function isViolationEntry(value: unknown): value is ViolationEntry {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.timestamp) &&
    isString(value.ruleName) &&
    RULE_NAMES.has(value.ruleName) &&
    isString(value.severity) &&
    VIOLATION_SEVERITIES.has(value.severity) &&
    isStringArray(value.triggeringProtocols) &&
    isNumberArray(value.triggeringODValues) &&
    isString(value.lotNumber) &&
    isBoolean(value.acknowledged) &&
    isNullableString(value.acknowledgedBy) &&
    isNullableString(value.acknowledgedAt) &&
    (value.correctiveAction === null || isCorrectiveAction(value.correctiveAction))
  );
}

function isAuditEntry(value: unknown): value is AuditEntry {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.timestamp) &&
    isString(value.action) &&
    AUDIT_ACTIONS.has(value.action) &&
    isString(value.performedBy) &&
    isQCEntry(value.originalValues) &&
    (value.newValues === null || isQCEntry(value.newValues)) &&
    isString(value.reason)
  );
}

function isQCSettings(value: unknown): value is QCSettings {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.labName) &&
    isString(value.labSection) &&
    isString(value.labAddress) &&
    isString(value.defaultPreparedBy) &&
    isString(value.defaultValidatedBy) &&
    isNumber(value.cvAlertThreshold) &&
    isNumber(value.minDataPointsForWestgard) &&
    value.dateFormat === 'YYYY-MM-DD' &&
    isNumber(value.recentLogsCount) &&
    isString(value.chartTheme) &&
    CHART_THEMES.has(value.chartTheme) &&
    isString(value.defaultChartView) &&
    CHART_VIEWS.has(value.defaultChartView)
  );
}

function isQCUser(value: unknown): value is QCUser {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.username) &&
    isString(value.displayName) &&
    isString(value.role) &&
    USER_ROLES.has(value.role) &&
    isString(value.pinHash) &&
    isString(value.createdAt) &&
    isNullableString(value.updatedAt) &&
    isNullableString(value.lastLoginAt) &&
    isBoolean(value.isActive)
  );
}

function isArrayOf<T>(value: unknown, itemGuard: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(itemGuard);
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown storage error.';
}

function normalizeStorageValue<T>(value: T | null): T | null {
  return value === null ? null : structuredClone(value);
}

function getKey<T>(key: string): T | null {
  try {
    const rawValue = window.localStorage.getItem(key);

    if (rawValue === null) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as T;
    return normalizeStorageValue(parsedValue);
  } catch (error) {
    throw new Error(`Failed to read storage key "${key}": ${toErrorMessage(error)}`);
  }
}

function setKey<T>(key: string, value: T): void {
  try {
    const rawIndex = window.localStorage.getItem(STORAGE_INDEX_KEY);
    const parsedIndex: unknown = rawIndex === null ? [] : JSON.parse(rawIndex);
    const storageIndex = isStringArray(parsedIndex) ? parsedIndex : [];

    if (value === undefined) {
      window.localStorage.removeItem(key);

      const nextIndex = storageIndex.filter((storedKey) => storedKey !== key);

      if (nextIndex.length === 0) {
        window.localStorage.removeItem(STORAGE_INDEX_KEY);
      } else {
        window.localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(nextIndex));
      }

      return;
    }

    window.localStorage.setItem(key, JSON.stringify(value));

    if (key.startsWith(STORAGE_PREFIX)) {
      const nextIndex = storageIndex.includes(key)
        ? storageIndex
        : [...storageIndex, key].sort((left, right) => left.localeCompare(right));

      window.localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(nextIndex));
    }
  } catch (error) {
    throw new Error(`Failed to write storage key "${key}": ${toErrorMessage(error)}`);
  }
}

function isInHouseControl(controlType: string): boolean {
  return controlType === 'in-house-control';
}

function buildPrimaryInHouseEntriesKey(disease: string): string {
  return `${STORAGE_PREFIX}${disease}_inhouse`;
}

function buildLegacyInHouseEntriesKey(disease: string): string {
  return `${STORAGE_PREFIX}${disease}_in-house-control`;
}

function requireNonEmptyString(value: string, label: string): string {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error(`${label} is required.`);
  }

  return normalizedValue;
}

function requireLotNumber(controlType: string, lotNumber?: string): string {
  if (isInHouseControl(controlType)) {
    return '';
  }

  if (lotNumber === undefined) {
    throw new Error(`lotNumber is required for ${controlType}.`);
  }

  return requireNonEmptyString(lotNumber, 'Lot number');
}

function hasStoredKey(key: string): boolean {
  return window.localStorage.getItem(key) !== null;
}

function migrateInHouseEntriesKey(disease: string): void {
  const primaryKey = buildPrimaryInHouseEntriesKey(disease);
  const legacyKey = buildLegacyInHouseEntriesKey(disease);

  if (hasStoredKey(primaryKey) || !hasStoredKey(legacyKey)) {
    return;
  }

  const legacyEntries = getKey<unknown>(legacyKey);

  if (legacyEntries !== null) {
    setKey(primaryKey, legacyEntries);
  }

  setKey<undefined>(legacyKey, undefined);
}

function buildEntriesKey(disease: string, controlType: string, lotNumber?: string): string {
  const safeDisease = requireNonEmptyString(disease, 'Disease');
  const safeControlType = requireNonEmptyString(controlType, 'Control type');

  if (isInHouseControl(safeControlType)) {
    migrateInHouseEntriesKey(safeDisease);
    return buildPrimaryInHouseEntriesKey(safeDisease);
  }

  const safeLotNumber = requireLotNumber(safeControlType, lotNumber);
  return `${STORAGE_PREFIX}${safeDisease}_${safeControlType}_${safeLotNumber}`;
}

function buildLotsKey(disease: string, controlType: string): string {
  const safeDisease = requireNonEmptyString(disease, 'Disease');
  const safeControlType = requireNonEmptyString(controlType, 'Control type');
  return `qc_lots_${safeDisease}_${safeControlType}`;
}

function buildViolationsKey(disease: string, controlType: string, lotNumber?: string): string {
  const safeDisease = requireNonEmptyString(disease, 'Disease');
  const safeControlType = requireNonEmptyString(controlType, 'Control type');

  if (isInHouseControl(safeControlType)) {
    return `qc_violations_${safeDisease}_${safeControlType}`;
  }

  return `qc_violations_${safeDisease}_${safeControlType}_${requireLotNumber(safeControlType, lotNumber)}`;
}

function buildAuditKey(disease: string, controlType: string, lotNumber?: string): string {
  const safeDisease = requireNonEmptyString(disease, 'Disease');
  const safeControlType = requireNonEmptyString(controlType, 'Control type');

  if (isInHouseControl(safeControlType)) {
    return `qc_audit_${safeDisease}_${safeControlType}`;
  }

  return `qc_audit_${safeDisease}_${safeControlType}_${requireLotNumber(safeControlType, lotNumber)}`;
}

function readManagedKeys(): string[] {
  const keys = getKey<string[]>(STORAGE_INDEX_KEY);
  return keys === null ? [] : keys.filter((key) => key.startsWith(STORAGE_PREFIX));
}

function readEntries(key: string): QCEntry[] {
  const entries = getKey<unknown>(key);

  if (entries === null) {
    return [];
  }

  if (!isArrayOf(entries, isQCEntry)) {
    throw new Error(`Stored entries for "${key}" are malformed.`);
  }

  return entries;
}

function readLots(key: string): LotMetadata[] {
  const lots = getKey<unknown>(key);

  if (lots === null) {
    return [];
  }

  if (!isArrayOf(lots, isLotMetadata)) {
    throw new Error(`Stored lots for "${key}" are malformed.`);
  }

  return lots;
}

function readViolations(key: string): ViolationEntry[] {
  const violations = getKey<unknown>(key);

  if (violations === null) {
    return [];
  }

  if (!isArrayOf(violations, isViolationEntry)) {
    throw new Error(`Stored violations for "${key}" are malformed.`);
  }

  return violations;
}

function readAuditLogEntries(key: string): AuditEntry[] {
  const auditEntries = getKey<unknown>(key);

  if (auditEntries === null) {
    return [];
  }

  if (!isArrayOf(auditEntries, isAuditEntry)) {
    throw new Error(`Stored audit entries for "${key}" are malformed.`);
  }

  return auditEntries;
}

function readUsersFromStorage(): QCUser[] {
  const users = getKey<unknown>(USERS_KEY);

  if (users === null) {
    return [];
  }

  if (!isArrayOf(users, isQCUser)) {
    throw new Error('Stored user accounts are malformed.');
  }

  return users;
}

function sortEntriesAscending(entries: QCEntry[]): QCEntry[] {
  return [...entries].sort((left, right) => {
    const dateComparison = left.date.localeCompare(right.date);
    return dateComparison !== 0 ? dateComparison : left.protocolNumber.localeCompare(right.protocolNumber);
  });
}

function validateEntryArray(entries: QCEntry[]): void {
  const protocolNumbers = new Set<string>();

  for (const entry of entries) {
    if (protocolNumbers.has(entry.protocolNumber)) {
      throw new Error(`Protocol number "${entry.protocolNumber}" already exists in this dataset.`);
    }

    protocolNumbers.add(entry.protocolNumber);
  }
}

function sortLotsDescending(lots: LotMetadata[]): LotMetadata[] {
  return [...lots].sort((left, right) => right.startDate.localeCompare(left.startDate));
}

function sortViolationsDescending(violations: ViolationEntry[]): ViolationEntry[] {
  return [...violations].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

function sortAllViolationsDescending(violations: ViolationEntry[]): ViolationEntry[] {
  return [...violations].sort((left, right) => {
    const timestampComparison = right.timestamp.localeCompare(left.timestamp);

    if (timestampComparison !== 0) {
      return timestampComparison;
    }

    if (left.severity === right.severity) {
      return 0;
    }

    return left.severity === 'rejection' ? -1 : 1;
  });
}

function sortAuditEntriesDescending(entries: AuditEntry[]): AuditEntry[] {
  return [...entries].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

function snapshotManagedData(): StoredBackup {
  const snapshot: StoredBackup = {};

  for (const key of readManagedKeys()) {
    const value = getKey<unknown>(key);

    if (value !== null) {
      snapshot[key] = value;
    }
  }

  return snapshot;
}

function restoreSnapshot(snapshot: StoredBackup): void {
  const existingKeys = readManagedKeys();

  for (const key of existingKeys) {
    setKey<undefined>(key, undefined);
  }

  for (const [key, value] of Object.entries(snapshot)) {
    setKey(key, value);
  }
}

function applyMutationsAtomically(mutations: StorageMutation[], actionLabel: string): void {
  const previousValues = mutations.map(({ key }) => ({
    key,
    value: getKey<unknown>(key),
  }));

  try {
    for (const mutation of mutations) {
      setKey(mutation.key, mutation.value);
    }
  } catch (error) {
    try {
      for (const previousValue of previousValues) {
        if (previousValue.value === null) {
          setKey<undefined>(previousValue.key, undefined);
        } else {
          setKey(previousValue.key, previousValue.value);
        }
      }
    } catch (rollbackError) {
      throw new Error(
        `Failed to ${actionLabel}: ${toErrorMessage(error)} Rollback also failed: ${toErrorMessage(rollbackError)}`,
      );
    }

    throw new Error(`Failed to ${actionLabel}: ${toErrorMessage(error)}`);
  }
}

function validateProtocolUniqueness(entries: QCEntry[], protocolNumber: string, excludeEntryId?: string): void {
  const duplicateEntry = entries.find(
    (entry) => entry.protocolNumber === protocolNumber && (excludeEntryId === undefined || entry.id !== excludeEntryId),
  );

  if (duplicateEntry !== undefined) {
    throw new Error(`Protocol number "${protocolNumber}" already exists in this dataset.`);
  }
}

function normalizeTriggeringProtocols(protocols: string[]): string[] {
  return [...protocols].sort((left, right) => left.localeCompare(right));
}

function ensureBackupPayload(value: unknown): StoredBackup {
  if (!isRecord(value) || Array.isArray(value)) {
    throw new Error('Backup payload must be a JSON object keyed by storage key.');
  }

  const entries = Object.entries(value);

  for (const [key, storedValue] of entries) {
    if (!key.startsWith(STORAGE_PREFIX)) {
      throw new Error(`Backup contains unsupported key "${key}".`);
    }

    if (key === SETTINGS_KEY) {
      if (!isQCSettings(storedValue)) {
        throw new Error('Backup settings payload is malformed.');
      }
      continue;
    }

    if (key === USERS_KEY) {
      if (!isArrayOf(storedValue, isQCUser)) {
        throw new Error('Backup user payload is malformed.');
      }
      continue;
    }

    if (key === LOGO_KEYS.seal || key === LOGO_KEYS.pathology) {
      if (!isString(storedValue)) {
        throw new Error(`Backup logo payload for "${key}" is malformed.`);
      }
      continue;
    }

    if (key.startsWith('qc_lots_')) {
      if (!isArrayOf(storedValue, isLotMetadata)) {
        throw new Error(`Backup lot payload for "${key}" is malformed.`);
      }
      continue;
    }

    if (key.startsWith('qc_violations_')) {
      if (!isArrayOf(storedValue, isViolationEntry)) {
        throw new Error(`Backup violation payload for "${key}" is malformed.`);
      }
      continue;
    }

    if (key.startsWith('qc_audit_')) {
      if (!isArrayOf(storedValue, isAuditEntry)) {
        throw new Error(`Backup audit payload for "${key}" is malformed.`);
      }
      continue;
    }

    if (!isArrayOf(storedValue, isQCEntry)) {
      throw new Error(`Backup entry payload for "${key}" is malformed.`);
    }
  }

  return value;
}

/**
 * Returns QC entries for a disease/control dataset sorted oldest to newest.
 *
 * @param disease Disease slug that owns the dataset.
 * @param controlType Control slug for the dataset.
 * @param lotNumber Reagent lot number for positive/negative controls. Omit for in-house control.
 * @throws {Error} When the dataset key is invalid or stored data is malformed.
 */
export async function getEntries(disease: string, controlType: string, lotNumber?: string): Promise<QCEntry[]> {
  const key = buildEntriesKey(disease, controlType, lotNumber);
  return sortEntriesAscending(readEntries(key));
}

/**
 * Appends a QC entry to a dataset after preventing duplicate protocol numbers.
 *
 * @param disease Disease slug that owns the dataset.
 * @param controlType Control slug for the dataset.
 * @param entry Fully constructed QC entry to store.
 * @param lotNumber Reagent lot number for positive/negative controls. Omit for in-house control.
 * @throws {Error} When the entry is malformed, the key is invalid, or the protocol number already exists.
 */
export async function addEntry(
  disease: string,
  controlType: string,
  entry: QCEntry,
  lotNumber?: string,
): Promise<void> {
  if (!isQCEntry(entry)) {
    throw new Error('Cannot add QC entry because the payload is malformed.');
  }

  const key = buildEntriesKey(disease, controlType, lotNumber);
  const entries = readEntries(key);

  validateProtocolUniqueness(entries, entry.protocolNumber);
  setKey(key, [...entries, entry]);
}

/**
 * Seeds a dataset only when the target entries key does not already exist.
 *
 * @param disease Disease slug that owns the dataset.
 * @param controlType Control slug for the dataset.
 * @param entries Initial QC entries to persist.
 * @param lotNumber Reagent lot number for positive/negative controls. Omit for in-house control.
 * @throws {Error} When the payload is malformed or contains duplicate protocol numbers.
 */
export async function initializeEntries(
  disease: string,
  controlType: string,
  entries: QCEntry[],
  lotNumber?: string,
): Promise<void> {
  if (!isArrayOf(entries, isQCEntry)) {
    throw new Error('Cannot initialize QC entries because the payload is malformed.');
  }

  const key = buildEntriesKey(disease, controlType, lotNumber);

  if (hasStoredKey(key)) {
    return;
  }

  validateEntryArray(entries);
  setKey(key, sortEntriesAscending(entries));
}

/**
 * Updates an existing QC entry and appends its audit record as one atomic storage operation.
 *
 * @param disease Disease slug that owns the dataset.
 * @param controlType Control slug for the dataset.
 * @param updatedEntry Updated QC entry payload to persist.
 * @param auditEntry Audit record describing the edit.
 * @param lotNumber Reagent lot number for positive/negative controls. Omit for in-house control.
 * @throws {Error} When the entry is malformed, the target entry is missing or signed, or the audit payload is invalid.
 */
export async function updateEntry(
  disease: string,
  controlType: string,
  updatedEntry: QCEntry,
  auditEntry: AuditEntry,
  lotNumber?: string,
): Promise<void> {
  if (!isQCEntry(updatedEntry)) {
    throw new Error('Cannot update QC entry because the payload is malformed.');
  }

  if (!isAuditEntry(auditEntry)) {
    throw new Error('Cannot update QC entry because the audit payload is malformed.');
  }

  const entriesKey = buildEntriesKey(disease, controlType, lotNumber);
  const auditKey = buildAuditKey(disease, controlType, lotNumber);
  const entries = readEntries(entriesKey);
  const entryIndex = entries.findIndex((entry) => entry.id === updatedEntry.id);

  if (entryIndex === -1) {
    throw new Error(`QC entry "${updatedEntry.id}" does not exist.`);
  }

  if (entries[entryIndex].signedBy !== null) {
    throw new Error(`QC entry "${updatedEntry.id}" is signed and cannot be edited.`);
  }

  validateProtocolUniqueness(entries, updatedEntry.protocolNumber, updatedEntry.id);

  const nextEntries = [...entries];
  nextEntries[entryIndex] = updatedEntry;

  applyMutationsAtomically(
    [
      { key: entriesKey, value: nextEntries },
      { key: auditKey, value: [...readAuditLogEntries(auditKey), auditEntry] },
    ],
    `update QC entry "${updatedEntry.id}"`,
  );
}

/**
 * Deletes an existing QC entry and appends its audit record as one atomic storage operation.
 *
 * @param disease Disease slug that owns the dataset.
 * @param controlType Control slug for the dataset.
 * @param entryId Identifier of the QC entry to remove.
 * @param auditEntry Audit record describing the deletion.
 * @param lotNumber Reagent lot number for positive/negative controls. Omit for in-house control.
 * @throws {Error} When the target entry is missing or signed, or the audit payload is invalid.
 */
export async function deleteEntry(
  disease: string,
  controlType: string,
  entryId: string,
  auditEntry: AuditEntry,
  lotNumber?: string,
): Promise<void> {
  if (!isAuditEntry(auditEntry)) {
    throw new Error('Cannot delete QC entry because the audit payload is malformed.');
  }

  const safeEntryId = requireNonEmptyString(entryId, 'Entry ID');
  const entriesKey = buildEntriesKey(disease, controlType, lotNumber);
  const auditKey = buildAuditKey(disease, controlType, lotNumber);
  const entries = readEntries(entriesKey);
  const entryToDelete = entries.find((entry) => entry.id === safeEntryId);

  if (entryToDelete === undefined) {
    throw new Error(`QC entry "${safeEntryId}" does not exist.`);
  }

  if (entryToDelete.signedBy !== null) {
    throw new Error(`QC entry "${safeEntryId}" is signed and cannot be deleted.`);
  }

  applyMutationsAtomically(
    [
      { key: entriesKey, value: entries.filter((entry) => entry.id !== safeEntryId) },
      { key: auditKey, value: [...readAuditLogEntries(auditKey), auditEntry] },
    ],
    `delete QC entry "${safeEntryId}"`,
  );
}

/**
 * Returns all lot records for a disease/control pair sorted newest first by start date.
 *
 * @param disease Disease slug that owns the lots.
 * @param controlType Control slug whose lots should be read.
 * @throws {Error} When the lot payload is malformed.
 */
export async function getLots(disease: string, controlType: string): Promise<LotMetadata[]> {
  if (isInHouseControl(controlType)) {
    return [];
  }

  return sortLotsDescending(readLots(buildLotsKey(disease, controlType)));
}

/**
 * Returns the active lot for a disease/control pair, if one exists.
 *
 * @param disease Disease slug that owns the lots.
 * @param controlType Control slug whose active lot should be read.
 * @throws {Error} When the lot payload is malformed.
 */
export async function getActiveLot(disease: string, controlType: string): Promise<LotMetadata | null> {
  if (isInHouseControl(controlType)) {
    return null;
  }

  const lots = readLots(buildLotsKey(disease, controlType));
  return lots.find((lot) => lot.status === 'active') ?? null;
}

/**
 * Seeds lot metadata only when no lot registry exists for the control yet.
 *
 * @param disease Disease slug that owns the lots.
 * @param controlType Positive or negative control slug.
 * @param lots Initial lot metadata to persist.
 * @throws {Error} When called for in-house control or when the payload is malformed.
 */
export async function initializeLots(disease: string, controlType: string, lots: LotMetadata[]): Promise<void> {
  if (isInHouseControl(controlType)) {
    throw new Error('In-house control does not support lot management.');
  }

  if (!isArrayOf(lots, isLotMetadata)) {
    throw new Error('Cannot initialize lots because the payload is malformed.');
  }

  const key = buildLotsKey(disease, controlType);

  if (hasStoredKey(key)) {
    return;
  }

  setKey(key, lots);
}

/**
 * Creates a new reagent lot, archiving the existing active lot first if one is present.
 *
 * @param disease Disease slug that owns the lots.
 * @param controlType Positive or negative control slug.
 * @param lot Lot metadata to activate.
 * @throws {Error} When called for in-house control, the lot payload is malformed, or the lot number already exists.
 */
export async function createLot(disease: string, controlType: string, lot: LotMetadata): Promise<void> {
  if (isInHouseControl(controlType)) {
    throw new Error('In-house control does not support lot management.');
  }

  if (!isLotMetadata(lot)) {
    throw new Error('Cannot create lot because the payload is malformed.');
  }

  const lotsKey = buildLotsKey(disease, controlType);
  const lots = readLots(lotsKey);

  if (lots.some((existingLot) => existingLot.lotNumber === lot.lotNumber)) {
    throw new Error(`Lot number "${lot.lotNumber}" already exists for ${disease}/${controlType}.`);
  }

  const archivedLots = lots.map((existingLot) =>
    existingLot.status === 'active'
      ? {
          ...existingLot,
          endDate: lot.startDate,
          status: 'archived' as const,
        }
      : existingLot,
  );

  setKey(lotsKey, [...archivedLots, lot]);

  const entriesKey = buildEntriesKey(disease, controlType, lot.lotNumber);

  if (!hasStoredKey(entriesKey)) {
    setKey(entriesKey, []);
  }
}

/**
 * Archives a reagent lot without deleting any QC entries stored under that lot.
 *
 * @param disease Disease slug that owns the lots.
 * @param controlType Positive or negative control slug.
 * @param lotNumber Lot number to archive.
 * @throws {Error} When called for in-house control or when the lot does not exist.
 */
export async function archiveLot(disease: string, controlType: string, lotNumber: string): Promise<void> {
  if (isInHouseControl(controlType)) {
    throw new Error('In-house control does not support lot archival.');
  }

  const safeLotNumber = requireNonEmptyString(lotNumber, 'Lot number');
  const lotsKey = buildLotsKey(disease, controlType);
  const lots = readLots(lotsKey);
  const targetLot = lots.find((lot) => lot.lotNumber === safeLotNumber);

  if (targetLot === undefined) {
    throw new Error(`Lot "${safeLotNumber}" does not exist for ${disease}/${controlType}.`);
  }

  setKey(
    lotsKey,
    lots.map((lot) =>
      lot.lotNumber === safeLotNumber
        ? {
            ...lot,
            status: 'archived' as const,
            endDate: getTodayIsoDate(),
          }
        : lot,
    ),
  );
}

/**
 * Returns violations for a single control stream sorted newest first.
 *
 * @param disease Disease slug that owns the violation log.
 * @param controlType Control slug for the violation log.
 * @param lotNumber Reagent lot number for positive/negative controls. Omit for in-house control.
 * @throws {Error} When the stored violation payload is malformed.
 */
export async function getViolations(
  disease: string,
  controlType: string,
  lotNumber?: string,
): Promise<ViolationEntry[]> {
  return sortViolationsDescending(readViolations(buildViolationsKey(disease, controlType, lotNumber)));
}

/**
 * Aggregates every stored violation across diseases, controls, and lots.
 *
 * @throws {Error} When any stored violation payload is malformed.
 */
export async function getAllViolations(): Promise<ViolationEntry[]> {
  const violations = readManagedKeys()
    .filter((key) => key.startsWith('qc_violations_'))
    .flatMap((key) => readViolations(key));

  return sortAllViolationsDescending(violations);
}

/**
 * Appends a violation unless the same rule and triggering protocol combination already exists.
 *
 * @param disease Disease slug that owns the violation log.
 * @param controlType Control slug for the violation log.
 * @param violation Violation payload to store.
 * @param lotNumber Reagent lot number for positive/negative controls. Omit for in-house control.
 * @throws {Error} When the violation payload is malformed.
 */
export async function addViolation(
  disease: string,
  controlType: string,
  violation: ViolationEntry,
  lotNumber?: string,
): Promise<void> {
  if (!isViolationEntry(violation)) {
    throw new Error('Cannot add violation because the payload is malformed.');
  }

  const key = buildViolationsKey(disease, controlType, lotNumber);
  const violations = readViolations(key);
  const normalizedProtocols = normalizeTriggeringProtocols(violation.triggeringProtocols);
  const duplicate = violations.some(
    (existingViolation) =>
      existingViolation.ruleName === violation.ruleName &&
      JSON.stringify(normalizeTriggeringProtocols(existingViolation.triggeringProtocols)) ===
        JSON.stringify(normalizedProtocols),
  );

  if (!duplicate) {
    setKey(key, [...violations, violation]);
  }
}

/**
 * Acknowledges a violation by attaching corrective action details.
 *
 * @param disease Disease slug that owns the violation log.
 * @param controlType Control slug for the violation log.
 * @param violationId Identifier of the violation to acknowledge.
 * @param correctiveAction Corrective action details to attach.
 * @param lotNumber Reagent lot number for positive/negative controls. Omit for in-house control.
 * @throws {Error} When the violation is missing, already acknowledged, or the corrective action payload is malformed.
 */
export async function acknowledgeViolation(
  disease: string,
  controlType: string,
  violationId: string,
  correctiveAction: CorrectiveAction,
  lotNumber?: string,
): Promise<void> {
  if (!isCorrectiveAction(correctiveAction)) {
    throw new Error('Cannot acknowledge violation because the corrective action payload is malformed.');
  }

  const safeViolationId = requireNonEmptyString(violationId, 'Violation ID');
  const key = buildViolationsKey(disease, controlType, lotNumber);
  const violations = readViolations(key);
  const violationIndex = violations.findIndex((violation) => violation.id === safeViolationId);

  if (violationIndex === -1) {
    throw new Error(`Violation "${safeViolationId}" does not exist.`);
  }

  if (violations[violationIndex].acknowledged) {
    throw new Error(`Violation "${safeViolationId}" has already been acknowledged.`);
  }

  const nextViolations = [...violations];
  nextViolations[violationIndex] = {
    ...nextViolations[violationIndex],
    acknowledged: true,
    acknowledgedBy: correctiveAction.acknowledgedBy,
    acknowledgedAt: correctiveAction.acknowledgedAt,
    correctiveAction,
  };

  setKey(key, nextViolations);
}

/**
 * Returns the append-only audit log for a single control stream sorted newest first.
 *
 * @param disease Disease slug that owns the audit log.
 * @param controlType Control slug for the audit log.
 * @param lotNumber Reagent lot number for positive/negative controls. Omit for in-house control.
 * @throws {Error} When the stored audit payload is malformed.
 */
export async function getAuditLog(
  disease: string,
  controlType: string,
  lotNumber?: string,
): Promise<AuditEntry[]> {
  return sortAuditEntriesDescending(readAuditLogEntries(buildAuditKey(disease, controlType, lotNumber)));
}

/**
 * Appends an audit entry without modifying historical audit records.
 *
 * @param disease Disease slug that owns the audit log.
 * @param controlType Control slug for the audit log.
 * @param entry Audit entry to append.
 * @param lotNumber Reagent lot number for positive/negative controls. Omit for in-house control.
 * @throws {Error} When the audit payload is malformed.
 */
export async function appendAuditEntry(
  disease: string,
  controlType: string,
  entry: AuditEntry,
  lotNumber?: string,
): Promise<void> {
  if (!isAuditEntry(entry)) {
    throw new Error('Cannot append audit entry because the payload is malformed.');
  }

  const key = buildAuditKey(disease, controlType, lotNumber);
  setKey(key, [...readAuditLogEntries(key), entry]);
}

/**
 * Returns the current QC settings, persisting defaults when no settings have been stored yet.
 *
 * @throws {Error} When the stored settings payload is malformed.
 */
export async function getSettings(): Promise<QCSettings> {
  const settings = getKey<unknown>(SETTINGS_KEY);

  if (settings === null) {
    setKey(SETTINGS_KEY, DEFAULT_SETTINGS);
    return structuredClone(DEFAULT_SETTINGS);
  }

  if (!isQCSettings(settings)) {
    throw new Error('Stored QC settings are malformed.');
  }

  return settings;
}

/**
 * Merges a partial settings update into the existing QC settings record.
 *
 * @param settings Partial QC settings patch to persist.
 * @throws {Error} When the merged settings payload becomes invalid.
 */
export async function updateSettings(settings: Partial<QCSettings>): Promise<void> {
  const mergedSettings: QCSettings = {
    ...(await getSettings()),
    ...settings,
  };

  if (!isQCSettings(mergedSettings)) {
    throw new Error('Cannot update QC settings because the merged payload is malformed.');
  }

  setKey(SETTINGS_KEY, mergedSettings);
}

/**
 * Returns all stored QC user accounts.
 *
 * @throws {Error} When the stored user payload is malformed.
 */
export async function getUsers(): Promise<QCUser[]> {
  return readUsersFromStorage();
}

/**
 * Creates a new QC user account after enforcing username uniqueness.
 *
 * @param user Fully constructed QC user account to store.
 * @throws {Error} When the user payload is malformed or the username already exists.
 */
export async function createUser(user: QCUser): Promise<void> {
  if (!isQCUser(user)) {
    throw new Error('Cannot create user because the payload is malformed.');
  }

  const users = readUsersFromStorage();
  const username = user.username.trim().toLowerCase();

  if (users.some((existingUser) => existingUser.username.trim().toLowerCase() === username)) {
    throw new Error(`Username "${user.username}" already exists.`);
  }

  setKey(USERS_KEY, [...users, user]);
}

/**
 * Updates an existing QC user account.
 *
 * @param userId Identifier of the user to update.
 * @param updates Partial user payload to merge.
 * @throws {Error} When the target user is missing, the username collides, or the merged user payload is malformed.
 */
export async function updateUser(userId: string, updates: Partial<QCUser>): Promise<void> {
  const safeUserId = requireNonEmptyString(userId, 'User ID');
  const users = readUsersFromStorage();
  const userIndex = users.findIndex((user) => user.id === safeUserId);

  if (userIndex === -1) {
    throw new Error(`User "${safeUserId}" does not exist.`);
  }

  const mergedUser: QCUser = {
    ...users[userIndex],
    ...updates,
  };

  if (!isQCUser(mergedUser)) {
    throw new Error('Cannot update user because the merged payload is malformed.');
  }

  const normalizedUsername = mergedUser.username.trim().toLowerCase();
  const duplicateUsername = users.some(
    (user, index) => index !== userIndex && user.username.trim().toLowerCase() === normalizedUsername,
  );

  if (duplicateUsername) {
    throw new Error(`Username "${mergedUser.username}" already exists.`);
  }

  const nextUsers = [...users];
  nextUsers[userIndex] = mergedUser;
  setKey(USERS_KEY, nextUsers);
}

/**
 * Returns the requested stored logo asset as a base64 string.
 *
 * @param type Logo type to read.
 * @throws {Error} When the stored logo payload is malformed.
 */
export async function getLogo(type: 'seal' | 'pathology'): Promise<string | null> {
  const key = LOGO_KEYS[type];
  const logo = getKey<unknown>(key);

  if (logo === null) {
    return null;
  }

  if (!isString(logo)) {
    throw new Error(`Stored logo for "${type}" is malformed.`);
  }

  return logo;
}

/**
 * Stores a base64 logo asset for exports.
 *
 * @param type Logo type to write.
 * @param base64 Base64 image payload.
 * @throws {Error} When the base64 payload is empty.
 */
export async function setLogo(type: 'seal' | 'pathology', base64: string): Promise<void> {
  setKey(LOGO_KEYS[type], requireNonEmptyString(base64, `${type} logo`));
}

/**
 * Exports every managed QC local-storage key as a JSON snapshot string.
 *
 * @throws {Error} When managed storage cannot be read.
 */
export async function exportAllData(): Promise<string> {
  const snapshot = snapshotManagedData();
  return JSON.stringify(snapshot, null, 2);
}

/**
 * Restores managed QC local-storage keys from a backup JSON snapshot after validating its structure.
 *
 * @param json JSON string produced by the backup export flow.
 * @throws {Error} When the JSON is malformed, validation fails, or restore cannot be completed safely.
 */
export async function importAllData(json: string): Promise<void> {
  const existingSnapshot = snapshotManagedData();

  try {
    const parsed: unknown = JSON.parse(json);
    const backup = ensureBackupPayload(parsed);

    restoreSnapshot({});

    for (const [key, value] of Object.entries(backup)) {
      setKey(key, value);
    }
  } catch (error) {
    try {
      restoreSnapshot(existingSnapshot);
    } catch (rollbackError) {
      throw new Error(
        `Failed to import QC backup: ${toErrorMessage(error)} Rollback also failed: ${toErrorMessage(rollbackError)}`,
      );
    }

    throw new Error(`Failed to import QC backup: ${toErrorMessage(error)}`);
  }
}

/**
 * Removes every managed disease-specific key while leaving global settings, users, and logos intact.
 *
 * @param disease Disease slug whose persisted datasets should be cleared.
 * @throws {Error} When a storage key cannot be removed.
 */
export async function clearDiseaseData(disease: string): Promise<void> {
  const safeDisease = requireNonEmptyString(disease, 'Disease');
  const keyPrefixes = [
    `${STORAGE_PREFIX}${safeDisease}_`,
    `qc_lots_${safeDisease}_`,
    `qc_violations_${safeDisease}_`,
    `qc_audit_${safeDisease}_`,
  ];

  for (const key of readManagedKeys()) {
    if (keyPrefixes.some((prefix) => key.startsWith(prefix))) {
      setKey<undefined>(key, undefined);
    }
  }
}
