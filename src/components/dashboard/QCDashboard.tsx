import {
  ChartBarIcon,
  CheckIcon,
  ClockIcon,
  DotsThreeIcon,
  DownloadIcon,
  LockIcon,
  PencilIcon,
  PercentIcon,
  PlusCircleIcon,
  PlusIcon,
  PulseIcon,
  ShieldCheckIcon,
  TargetIcon,
  TrendDownIcon,
  TrendUpIcon,
  WarningIcon,
  XIcon,
} from '@phosphor-icons/react';
import { format, parseISO } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import LeveyJenningsChart from '@/components/chart/LeveyJenningsChart';
import { EditEntriesSheet } from '@/components/panels/EditEntriesSheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { IsoDatePicker } from '@/components/ui/IsoDatePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { DISEASE_DEFINITIONS } from '@/constants/monitor-config';
import { useQCLogic } from '@/hooks/useQCLogic';
import { useToast } from '@/hooks/useToast';
import {
  buildRunStatisticsSummary,
  DEFAULT_IN_HOUSE_LOT_NUMBER,
  ensureControlDatasetInitialized,
  entriesToChartData,
  getControlCode,
  getControlParameters,
} from '@/lib/qcMonitor';
import {
  addEntry,
  addViolation,
  createLot,
  getEntries,
  getLots,
  getSession,
  getSettings,
  getViolations,
  updateEntry,
} from '@/lib/qcStorage';
import type {
  AuditEntry,
  ControlTypeSlug,
  DiseaseSlug,
  EntryFormValues,
  LotMetadata,
  QCEntry,
  QCEntryFlag,
  QCRule,
  QCSession,
  QCSettings,
  ViolationEntry,
} from '@/types/qc.types';
import { calculateStatistics, calculateZScore, evaluateQCRules } from '@/utils/qc-calculations';
import { validateODValue } from '@/utils/export';

interface QCDashboardProps {
  diseaseSlug: DiseaseSlug;
  controlType: ControlTypeSlug;
  diseaseName: string;
  controlName: string;
  assayTag?: string;
}

type NewLotFormValues = {
  lotNumber: string;
  startDate: string;
  notes: string;
};

type MonitorStatus = 'stable' | 'normal' | 'watchlist' | 'out';

type RecentFlagItem = {
  id: string;
  icon: 'warning' | 'flag';
  label: string;
  secondary: string;
  severity: 'warning' | 'rejection' | 'neutral';
  sortValue: string;
};

const DEFAULT_SETTINGS_FALLBACK: QCSettings = {
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

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function createDefaultEntryForm(): EntryFormValues {
  return {
    date: getTodayIsoDate(),
    odValue: '',
    protocolNumber: '',
    remarks: '',
  };
}

function createDefaultLotForm(): NewLotFormValues {
  return {
    lotNumber: '',
    startDate: getTodayIsoDate(),
    notes: '',
  };
}

function getSelectedLot(lots: LotMetadata[], selectedLotNumber: string): LotMetadata | null {
  return lots.find((lot) => lot.lotNumber === selectedLotNumber) ?? null;
}

function isPrivilegedRole(session: QCSession | null): boolean {
  return session?.role === 'supervisor' || session?.role === 'admin';
}

function canUsePrivilegedActions(session: QCSession | null): boolean {
  return session === null || isPrivilegedRole(session);
}

function getAuditActorLabel(session: QCSession | null): string {
  if (session === null) {
    return 'Local QC User';
  }

  return session.displayName || session.username;
}

function formatDateLabel(value: string | null): string {
  if (!value) {
    return 'Not set';
  }

  return format(parseISO(value), 'MMM dd, yyyy');
}

function formatDateTimeLabel(value: string | null): string {
  if (!value) {
    return 'Not available';
  }

  const resolvedValue = value.includes('T') ? value : `${value}T08:00:00`;
  return format(new Date(resolvedValue), 'MMM dd, hh:mm a');
}

function getEntryTimestamp(entry: QCEntry): string {
  return entry.editedAt ?? `${entry.date}T08:00:00`;
}

function getMonitorStatus(
  rules: QCRule[],
  totalRuns: number,
  minRunsForWestgard: number,
  isHighCV: boolean,
  isRisingCV: boolean,
): MonitorStatus {
  if (rules.some((rule) => rule.violated && rule.severity === 'rejection')) {
    return 'out';
  }

  if (rules.some((rule) => rule.violated && rule.severity === 'warning') || isHighCV || isRisingCV) {
    return 'watchlist';
  }

  if (totalRuns >= minRunsForWestgard && totalRuns > 0) {
    return 'stable';
  }

  return 'normal';
}

function getMonitorStatusMeta(status: MonitorStatus) {
  if (status === 'out') {
    return {
      badgeLabel: 'OUT OF CONTROL',
      healthLabel: 'Out of Control',
      badgeClassName: 'bg-[#fee2e2] text-[#dc2626]',
      systemBadgeClassName: 'bg-[#fee2e2] text-[#dc2626]',
      dotClassName: 'bg-[#dc2626]',
      ringClassName: 'border-[#dc2626] text-[#dc2626]',
      icon: XIcon,
    };
  }

  if (status === 'watchlist') {
    return {
      badgeLabel: 'WATCHLIST',
      healthLabel: 'Watchlist',
      badgeClassName: 'bg-[#fef3c7] text-[#d97706]',
      systemBadgeClassName: 'bg-[#fef3c7] text-[#d97706]',
      dotClassName: 'bg-[#d97706]',
      ringClassName: 'border-[#d97706] text-[#d97706]',
      icon: WarningIcon,
    };
  }

  if (status === 'stable') {
    return {
      badgeLabel: 'STABLE',
      healthLabel: 'Normal',
      badgeClassName: 'bg-[#dcfce7] text-[#16a34a]',
      systemBadgeClassName: 'bg-[#ccfbf1] text-[#0f766e]',
      dotClassName: 'bg-[#16a34a]',
      ringClassName: 'border-[#16a34a] text-[#16a34a]',
      icon: CheckIcon,
    };
  }

  return {
    badgeLabel: 'NORMAL',
    healthLabel: 'Normal',
    badgeClassName: 'bg-[#dcfce7] text-[#16a34a]',
    systemBadgeClassName: 'bg-[#dcfce7] text-[#16a34a]',
    dotClassName: 'bg-[#16a34a]',
    ringClassName: 'border-[#16a34a] text-[#16a34a]',
    icon: CheckIcon,
  };
}

function getZScoreTone(zScore: number) {
  const absoluteValue = Math.abs(zScore);

  if (absoluteValue > 3) {
    return {
      text: '#dc2626',
      tint: 'bg-[#fee2e2] text-[#dc2626]',
      status: 'Alert',
      dot: 'bg-[#dc2626]',
    };
  }

  if (absoluteValue > 2) {
    return {
      text: '#d97706',
      tint: 'bg-[#fef3c7] text-[#d97706]',
      status: 'Watch',
      dot: 'bg-[#d97706]',
    };
  }

  if (absoluteValue > 1) {
    return {
      text: '#16a34a',
      tint: 'bg-[#dcfce7] text-[#16a34a]',
      status: 'Valid',
      dot: 'bg-[#16a34a]',
    };
  }

  return {
    text: '#1a1aff',
    tint: 'bg-[#eff6ff] text-[#1a1aff]',
    status: 'Valid',
    dot: 'bg-[#0f766e]',
  };
}

function getFlagLabel(flag: QCEntryFlag): string {
  return flag.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildViolationEntries(entries: QCEntry[], rules: QCRule[], lotNumber: string): ViolationEntry[] {
  const timestamp = new Date().toISOString();

  return rules
    .filter((rule) => rule.violated && rule.status === 'violated' && (rule.triggeringIndices?.length ?? 0) > 0)
    .map((rule) => {
      const triggeringEntries = (rule.triggeringIndices ?? []).map((index) => entries[index]).filter(Boolean);

      return {
        id: crypto.randomUUID(),
        timestamp,
        ruleName: rule.name,
        severity: rule.severity ?? 'warning',
        triggeringProtocols: triggeringEntries.map((entry) => entry.protocolNumber),
        triggeringODValues: triggeringEntries.map((entry) => entry.odValue),
        lotNumber,
        acknowledged: false,
        acknowledgedBy: null,
        acknowledgedAt: null,
        correctiveAction: null,
      };
    });
}

function buildRecentFlags(entries: QCEntry[], violations: ViolationEntry[]): RecentFlagItem[] {
  const violationItems: RecentFlagItem[] = violations.map((violation) => ({
    id: violation.id,
    icon: 'warning',
    label: `Rule ${violation.ruleName.replace('_', '-')}${violation.severity === 'warning' ? ' Warning' : ' Rejection'}`,
    secondary: `${format(parseISO(violation.timestamp), 'MMM dd')} - ${violation.triggeringProtocols[0] ?? 'QC Run'}`,
    severity: violation.severity,
    sortValue: violation.timestamp,
  }));

  const flagItems: RecentFlagItem[] = entries
    .filter((entry) => entry.flag !== null)
    .map((entry) => ({
      id: `${entry.id}-flag`,
      icon: 'flag',
      label: getFlagLabel(entry.flag as QCEntryFlag),
      secondary: `${formatDateLabel(entry.date)} - ${entry.protocolNumber}`,
      severity: 'neutral',
      sortValue: getEntryTimestamp(entry),
    }));

  return [...violationItems, ...flagItems]
    .sort((left, right) => right.sortValue.localeCompare(left.sortValue))
    .slice(0, 3);
}

function downloadEntry(entry: QCEntry) {
  const payload = JSON.stringify(entry, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `${entry.protocolNumber || entry.id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildSparklinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) {
    return '';
  }

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

export default function QCDashboard({
  diseaseSlug,
  controlType,
  diseaseName,
  controlName,
  assayTag,
}: QCDashboardProps) {
  const navigate = useNavigate();
  const isInHouseControl = controlType === 'in-house-control';
  const parameters = useMemo(() => getControlParameters(diseaseSlug, controlType), [diseaseSlug, controlType]);
  const [entries, setEntries] = useState<QCEntry[]>([]);
  const [violations, setViolations] = useState<ViolationEntry[]>([]);
  const [lots, setLots] = useState<LotMetadata[]>([]);
  const [selectedLotNumber, setSelectedLotNumber] = useState('');
  const [formValues, setFormValues] = useState<EntryFormValues>(createDefaultEntryForm);
  const [newLotValues, setNewLotValues] = useState<NewLotFormValues>(createDefaultLotForm);
  const [settings, setSettings] = useState<QCSettings>(DEFAULT_SETTINGS_FALLBACK);
  const [isStartLotDialogOpen, setIsStartLotDialogOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [currentSession, setCurrentSession] = useState<QCSession | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<QCEntry | null>(null);
  const { success, error } = useToast();

  const baseChartData = useMemo(() => entriesToChartData(entries), [entries]);
  const { statistics, qcRules, cvTrend } = useQCLogic(baseChartData, parameters);
  const violationIndices = useMemo(
    () => new Set(qcRules.flatMap((rule) => (rule.violated ? rule.triggeringIndices ?? [] : []))),
    [qcRules],
  );
  const chartData = useMemo(
    () => baseChartData.map((point, index) => ({ ...point, isViolation: violationIndices.has(index) })),
    [baseChartData, violationIndices],
  );
  const runStatistics = useMemo(() => buildRunStatisticsSummary(baseChartData, statistics), [baseChartData, statistics]);
  const selectedLot = useMemo(() => getSelectedLot(lots, selectedLotNumber), [lots, selectedLotNumber]);
  const isArchivedLot = !isInHouseControl && selectedLot?.status === 'archived';
  const canEditEntries = canUsePrivilegedActions(currentSession);
  const activeDatasetLotNumber = isInHouseControl ? DEFAULT_IN_HOUSE_LOT_NUMBER : selectedLotNumber;
  const currentCV = cvTrend.currentCV ?? 0;
  const chartSubtitle = `${controlName.toUpperCase()} - ${diseaseName.toUpperCase()}${assayTag ? ` - ${assayTag}` : ''}`;
  const minRunsForWestgard = settings.minDataPointsForWestgard;
  const monitorStatus = getMonitorStatus(
    qcRules,
    runStatistics.totalRuns,
    minRunsForWestgard,
    cvTrend.isHigh,
    cvTrend.isRising,
  );
  const monitorStatusMeta = getMonitorStatusMeta(monitorStatus);
  const MonitorStatusIcon = monitorStatusMeta.icon;
  const liveODNumber = Number.parseFloat(formValues.odValue);
  const liveZScore =
    Number.isFinite(liveODNumber) && statistics.sampleCount >= 2 && statistics.sd > 0
      ? calculateZScore(liveODNumber, statistics.mean, statistics.sd)
      : null;
  const recentFlags = useMemo(() => buildRecentFlags(entries, violations), [entries, violations]);
  const sortedRecentEntries = useMemo(
    () =>
      [...entries]
        .sort((left, right) => getEntryTimestamp(right).localeCompare(getEntryTimestamp(left)))
        .slice(0, settings.recentLogsCount),
    [entries, settings.recentLogsCount],
  );

  const nextDisease = useMemo(() => {
    const diseaseIndex = DISEASE_DEFINITIONS.findIndex((disease) => disease.slug === diseaseSlug);
    return diseaseIndex >= 0 ? DISEASE_DEFINITIONS[diseaseIndex + 1] ?? null : null;
  }, [diseaseSlug]);

  useEffect(() => {
    let isCancelled = false;

    const initializeMonitor = async () => {
      setIsLoading(true);

      try {
        await ensureControlDatasetInitialized(diseaseSlug, controlType);
        const [session, appSettings] = await Promise.all([getSession(), getSettings()]);

        if (isCancelled) {
          return;
        }

        setCurrentSession(session);
        setSettings(appSettings);

        if (isInHouseControl) {
          const [inHouseEntries, inHouseViolations] = await Promise.all([
            getEntries(diseaseSlug, controlType),
            getViolations(diseaseSlug, controlType),
          ]);

          if (!isCancelled) {
            setEntries(inHouseEntries);
            setViolations(inHouseViolations);
            setLots([]);
            setSelectedLotNumber('');
          }

          return;
        }

        const storedLots = await getLots(diseaseSlug, controlType);
        const nextSelectedLotNumber =
          storedLots.find((lot) => lot.lotNumber === selectedLotNumber)?.lotNumber ??
          storedLots.find((lot) => lot.status === 'active')?.lotNumber ??
          storedLots[0]?.lotNumber ??
          '';

        const [selectedEntries, selectedViolations] =
          nextSelectedLotNumber.length > 0
            ? await Promise.all([
                getEntries(diseaseSlug, controlType, nextSelectedLotNumber),
                getViolations(diseaseSlug, controlType, nextSelectedLotNumber),
              ])
            : [[], []];

        if (!isCancelled) {
          setLots(storedLots);
          setSelectedLotNumber(nextSelectedLotNumber);
          setEntries(selectedEntries);
          setViolations(selectedViolations);
        }
      } catch (caughtError) {
        if (!isCancelled) {
          error(caughtError instanceof Error ? caughtError.message : 'Unable to load QC monitor data.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void initializeMonitor();

    return () => {
      isCancelled = true;
    };
  }, [controlType, diseaseSlug, error, isInHouseControl, selectedLotNumber]);

  const refreshViolationsEvent = () => {
    window.dispatchEvent(new CustomEvent('qc-violations-changed'));
  };

  const handleFieldChange = (field: keyof EntryFormValues, value: string) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleAddEntry = async () => {
    const datasetLotNumber = isInHouseControl ? DEFAULT_IN_HOUSE_LOT_NUMBER : selectedLotNumber;

    if (!formValues.date) {
      error('Date is required.');
      return;
    }

    if (!formValues.protocolNumber.trim()) {
      error('Protocol number is required.');
      return;
    }

    if (!datasetLotNumber) {
      error('Select an active lot before adding entries.');
      return;
    }

    const odValidation = validateODValue(formValues.odValue);

    if (!odValidation.isValid) {
      error(odValidation.error ?? 'Please enter a valid OD value.');
      return;
    }

    const nextEntry: QCEntry = {
      id: crypto.randomUUID(),
      date: formValues.date,
      protocolNumber: formValues.protocolNumber.trim(),
      odValue: Number.parseFloat(formValues.odValue),
      lotNumber: datasetLotNumber,
      controlCode: getControlCode(controlType),
      runNumber: String(entries.length + 1).padStart(2, '0'),
      vialNumber: `V${String(entries.length + 1).padStart(2, '0')}`,
      flag: null,
      notes: formValues.remarks.trim() ? formValues.remarks.trim() : null,
      editedAt: null,
      editReason: null,
      signedBy: null,
      signedAt: null,
    };

    setIsSubmitting(true);

    try {
      await addEntry(diseaseSlug, controlType, nextEntry, isInHouseControl ? undefined : datasetLotNumber);

      const updatedEntries = await getEntries(
        diseaseSlug,
        controlType,
        isInHouseControl ? undefined : datasetLotNumber,
      );
      const recalculatedChartData = entriesToChartData(updatedEntries);
      const recalculatedStatistics = calculateStatistics(recalculatedChartData);
      const recalculatedRules = evaluateQCRules(recalculatedChartData, recalculatedStatistics, parameters);
      const potentialViolations = buildViolationEntries(updatedEntries, recalculatedRules, nextEntry.lotNumber);

      for (const violation of potentialViolations) {
        await addViolation(
          diseaseSlug,
          controlType,
          violation,
          isInHouseControl ? undefined : datasetLotNumber,
        );
      }

      const updatedViolations = await getViolations(
        diseaseSlug,
        controlType,
        isInHouseControl ? undefined : datasetLotNumber,
      );

      setEntries(updatedEntries);
      setViolations(updatedViolations);
      setFormValues(createDefaultEntryForm());
      setHasSubmitted(true);
      success('Entry recorded successfully');
      refreshViolationsEvent();
    } catch (caughtError) {
      error(caughtError instanceof Error ? caughtError.message : 'Unable to save the QC entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEditedEntry = async (entry: QCEntry, odValue: number, reason: string) => {
    if (!canEditEntries) {
      const message = 'Only Supervisor and Admin roles can edit QC entries.';
      error(message);
      throw new Error(message);
    }

    if (isArchivedLot) {
      const message = 'Archived lots are read-only and cannot be edited.';
      error(message);
      throw new Error(message);
    }

    if (entry.signedBy !== null) {
      const message = `Entry ${entry.protocolNumber} is signed and cannot be edited.`;
      error(message);
      throw new Error(message);
    }

    const timestamp = new Date().toISOString();
    const updatedEntry: QCEntry = {
      ...entry,
      odValue,
      editedAt: timestamp,
      editReason: reason,
    };
    const auditEntry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp,
      action: 'EDIT',
      performedBy: getAuditActorLabel(currentSession),
      originalValues: entry,
      newValues: updatedEntry,
      reason,
    };

    try {
      await updateEntry(
        diseaseSlug,
        controlType,
        updatedEntry,
        auditEntry,
        isInHouseControl ? undefined : activeDatasetLotNumber,
      );

      const updatedEntries = entries.map((currentEntry) => (currentEntry.id === entry.id ? updatedEntry : currentEntry));
      const recalculatedChartData = entriesToChartData(updatedEntries);
      const recalculatedStatistics = calculateStatistics(recalculatedChartData);
      const recalculatedRules = evaluateQCRules(recalculatedChartData, recalculatedStatistics, parameters);
      const potentialViolations = buildViolationEntries(updatedEntries, recalculatedRules, updatedEntry.lotNumber);

      for (const violation of potentialViolations) {
        await addViolation(
          diseaseSlug,
          controlType,
          violation,
          isInHouseControl ? undefined : activeDatasetLotNumber,
        );
      }

      const [refreshedEntries, refreshedViolations] = await Promise.all([
        getEntries(diseaseSlug, controlType, isInHouseControl ? undefined : activeDatasetLotNumber),
        getViolations(diseaseSlug, controlType, isInHouseControl ? undefined : activeDatasetLotNumber),
      ]);

      setEntries(refreshedEntries);
      setViolations(refreshedViolations);
      success(`Entry ${entry.protocolNumber} updated and logged in the audit trail.`);
      refreshViolationsEvent();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to update the QC entry.';
      error(message);
      throw new Error(message);
    }
  };

  const handleCreateLot = async () => {
    const trimmedLotNumber = newLotValues.lotNumber.trim();

    if (!trimmedLotNumber) {
      error('Lot number is required.');
      return;
    }

    try {
      await createLot(diseaseSlug, controlType, {
        lotNumber: trimmedLotNumber,
        startDate: newLotValues.startDate,
        endDate: null,
        expiryDate: null,
        status: 'active',
        notes: newLotValues.notes.trim() ? newLotValues.notes.trim() : null,
      });

      const updatedLots = await getLots(diseaseSlug, controlType);
      const updatedEntries = await getEntries(diseaseSlug, controlType, trimmedLotNumber);

      setLots(updatedLots);
      setSelectedLotNumber(trimmedLotNumber);
      setEntries(updatedEntries);
      setViolations([]);
      setIsStartLotDialogOpen(false);
      setNewLotValues(createDefaultLotForm());
      success(`Lot ${trimmedLotNumber} is now active.`);
    } catch (caughtError) {
      error(caughtError instanceof Error ? caughtError.message : 'Unable to start the new lot.');
    }
  };

  const chartTrendDelta =
    cvTrend.rollingCV.length >= 2
      ? cvTrend.rollingCV[cvTrend.rollingCV.length - 1].value - cvTrend.rollingCV[cvTrend.rollingCV.length - 2].value
      : 0;
  const trendDirection = chartTrendDelta <= 0 ? 'down' : 'up';
  const trendPath = buildSparklinePath(cvTrend.sparklinePoints);
  const trendAreaPath =
    cvTrend.sparklinePoints.length > 0
      ? `${trendPath} L ${cvTrend.sparklinePoints[cvTrend.sparklinePoints.length - 1].x} 80 L ${cvTrend.sparklinePoints[0].x} 80 Z`
      : '';

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.05em] text-[#9ca3af]">{chartSubtitle}</p>
          <h1 className="mt-2 text-[28px] font-bold text-[#111827]">{`${diseaseName} ${controlName}`}</h1>
        </div>
      </div>

      {!isInHouseControl && (
        <div className="qc-card mb-6 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Active Lot</p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Select value={selectedLotNumber} onValueChange={setSelectedLotNumber}>
                  <SelectTrigger className="h-11 w-full max-w-md border-[#e5e7eb] bg-white">
                    <SelectValue placeholder="Select reagent lot" />
                  </SelectTrigger>
                  <SelectContent>
                    {lots.map((lot) => (
                      <SelectItem key={lot.lotNumber} value={lot.lotNumber}>
                        {`${lot.lotNumber} - ${lot.status === 'active' ? 'Active' : 'Archived'} - ${formatDateLabel(lot.startDate)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedLot && (
                  <div className="flex items-center gap-2 text-sm text-[#6b7280]">
                    <Badge className={selectedLot.status === 'active' ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#f3f4f6] text-[#6b7280]'}>
                      {selectedLot.status === 'active' ? 'Active' : 'Archived'}
                    </Badge>
                    <span>Started {formatDateLabel(selectedLot.startDate)}</span>
                  </div>
                )}
              </div>
            </div>

            <Button type="button" variant="outline" className="h-11 border-[#dbe4ff] text-[#1a1aff]" onClick={() => setIsStartLotDialogOpen(true)}>
              <PlusCircleIcon size={16} />
              Start new lot
            </Button>
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="qc-card lg:col-span-2">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#9ca3af]">NEW QC ENTRY</p>
              <h2 className="mt-3 text-[18px] font-semibold text-[#111827]">Record run details for this dataset</h2>
            </div>
          </div>

          {isArchivedLot && (
            <div className="mb-5 rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-sm text-[#6b7280]">
              This archived lot is read-only. Select an active lot or start a new lot to continue recording.
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleAddEntry();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Date</label>
                <IsoDatePicker
                  value={formValues.date}
                  onChange={(value) => handleFieldChange('date', value)}
                  disabled={isArchivedLot}
                  displayFormat={settings.dateFormat}
                  className="h-11 border-[#e5e7eb] bg-white text-[#111827] hover:bg-[#f8fafc]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">OD Value (ABS)</label>
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="0.0000"
                  value={formValues.odValue}
                  disabled={isArchivedLot}
                  onChange={(event) => handleFieldChange('odValue', event.target.value)}
                  className="h-11 border-[#e5e7eb] bg-white px-3 text-[#111827]"
                />
                {liveZScore !== null && (
                  <p className="text-[11px] font-medium" style={{ color: getZScoreTone(liveZScore).text }}>
                    {`Z: ${liveZScore >= 0 ? '+' : ''}${liveZScore.toFixed(2)}`}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Protocol No.</label>
                <Input
                  placeholder="Enter protocol number"
                  value={formValues.protocolNumber}
                  disabled={isArchivedLot}
                  onChange={(event) => handleFieldChange('protocolNumber', event.target.value)}
                  className="h-11 border-[#e5e7eb] bg-white px-3 text-[#111827]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)]">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Remarks</label>
                <Input
                  placeholder="Optional remarks"
                  value={formValues.remarks}
                  disabled={isArchivedLot}
                  maxLength={200}
                  onChange={(event) => handleFieldChange('remarks', event.target.value)}
                  className="h-11 border-[#e5e7eb] bg-white px-3 text-[#111827]"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={isArchivedLot || isSubmitting}
                  className="h-11 w-full rounded-lg bg-[#1a1aff] text-sm font-semibold text-white hover:bg-[#1515cc]"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Recording'}
                </Button>
              </div>
            </div>

            {hasSubmitted && (
              <div>
                {nextDisease ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full border-[#dbe4ff] text-[#1a1aff]"
                    onClick={() => navigate(`/monitor/${nextDisease.slug}/${controlType}`)}
                  >
                    {`Next disease -> ${nextDisease.name}`}
                  </Button>
                ) : (
                  <div className="flex h-11 items-center justify-center rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] text-sm font-semibold text-[#16a34a]">
                    All diseases recorded
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        <div className="qc-card flex flex-col">
          <div className="mb-8 flex items-start justify-between gap-4">
            <h2 className="text-[16px] font-semibold text-[#111827]">System Health</h2>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="flex items-center gap-5">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full border-4 ${monitorStatusMeta.ringClassName}`}>
                <MonitorStatusIcon size={26} />
              </div>
              <div>
                <p className="text-[28px] font-bold text-[#111827]">{monitorStatusMeta.healthLabel}</p>
                <p className="text-[13px] text-[#6b7280]">
                  {`Last entry validated: ${entries.length > 0 ? formatDateTimeLabel(getEntryTimestamp(entries[entries.length - 1])) : 'No entries yet'}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
        {[
          { label: 'MEAN', value: runStatistics.mean.toFixed(3), color: '#111827', icon: TargetIcon, iconColor: '#7c3aed' },
          { label: 'SD', value: runStatistics.sd.toFixed(3), color: '#111827', icon: TrendUpIcon, iconColor: '#0891b2' },
          { label: 'SUM', value: runStatistics.sum.toFixed(3), color: '#111827', icon: PlusIcon, iconColor: '#6b7280' },
          { label: 'CV %', value: `${runStatistics.cv.toFixed(2)}%`, color: '#1a1aff', icon: PercentIcon, iconColor: '#d97706' },
          { label: 'LAST OD', value: runStatistics.lastOD === null ? '-' : runStatistics.lastOD.toFixed(4), color: '#1a1aff', icon: PulseIcon, iconColor: '#1a1aff' },
          { label: 'TOTAL RUNS', value: `${runStatistics.totalRuns}`, color: '#111827', icon: ChartBarIcon, iconColor: '#7c3aed' },
          { label: 'CONFIDENCE', value: `${runStatistics.confidence.toFixed(0)}%`, color: '#111827', icon: ShieldCheckIcon, iconColor: '#16a34a' },
        ].map((stat) => {
          const StatIcon = stat.icon;

          return (
            <div key={stat.label} className="rounded-[12px] border border-[#f0f0f0] bg-white px-5 py-4 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.05em] text-[#6b7280]">{stat.label}</p>
                <StatIcon size={18} style={{ color: stat.iconColor }} />
              </div>
              <p className="mt-5 text-[22px] font-bold" style={{ color: stat.color }}>
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-10">
        <div className="xl:col-span-7">
          <LeveyJenningsChart
            data={chartData}
            statistics={statistics}
            parameters={parameters}
            title="Levey-Jennings Quality Control Chart"
            height={440}
            headerActions={
              canEditEntries ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-[#dbe4ff] text-[#1f3d87]"
                  onClick={() => setIsEditSheetOpen(true)}
                  disabled={isArchivedLot}
                >
                  <PencilIcon size={14} />
                  Edit entries
                </Button>
              ) : null
            }
            badgeLabel={`${chartData.length} runs`}
            showChartTitle={false}
          />
        </div>

        <div className="space-y-6 xl:col-span-3">
          <div className="qc-card">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-[15px] font-semibold text-[#111827]">CV Trend</h3>
              <div className={`flex items-center gap-1 text-[13px] font-semibold ${trendDirection === 'down' ? 'text-[#0f766e]' : 'text-[#d97706]'}`}>
                <span>{`${Math.abs(chartTrendDelta).toFixed(1)}%`}</span>
                {trendDirection === 'down' ? <TrendDownIcon size={14} /> : <TrendUpIcon size={14} />}
              </div>
            </div>

            <div className="mb-4 h-20 rounded-xl bg-[linear-gradient(180deg,rgba(13,148,136,0.04)_0%,rgba(13,148,136,0.01)_100%)] p-1">
              {cvTrend.sparklinePoints.length > 0 ? (
                <svg viewBox="0 0 160 80" className="h-full w-full" role="img" aria-label="CV trend sparkline">
                  <path d={trendAreaPath} fill="rgba(13,148,136,0.10)" />
                  <path d={trendPath} fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              ) : (
                <div className="flex h-full items-center justify-center text-center text-[13px] text-[#9ca3af]">
                  Rolling CV trend appears after 10 runs.
                </div>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#6b7280]">Current CV</span>
                <span className="font-bold text-[#111827]">{`${currentCV.toFixed(2)}%`}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6b7280]">Threshold</span>
                <span className="font-medium text-[#111827]">{`${settings.cvAlertThreshold.toFixed(1)}%`}</span>
              </div>
            </div>

            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[#e5e7eb]">
              <div
                className={`h-full rounded-full ${currentCV > settings.cvAlertThreshold ? 'bg-[#dc2626]' : 'bg-[#0d9488]'}`}
                style={{ width: `${Math.min((currentCV / settings.cvAlertThreshold) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="qc-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#111827]">Recent Flags</h3>
            </div>

            {recentFlags.length === 0 ? (
              <div className="py-4 text-center text-[13px] text-[#9ca3af]">No recent flags</div>
            ) : (
              <div className="space-y-4">
                {recentFlags.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        item.icon === 'warning'
                          ? item.severity === 'rejection'
                            ? 'bg-[#fee2e2] text-[#dc2626]'
                            : 'bg-[#fef3c7] text-[#d97706]'
                          : 'bg-[#f3f4f6] text-[#6b7280]'
                      }`}
                    >
                      {item.icon === 'warning' ? <WarningIcon size={16} /> : <ClockIcon size={16} />}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[#111827]">{item.label}</p>
                      <p className="text-[12px] text-[#6b7280]">{item.secondary}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button type="button" variant="outline" className="mt-5 h-10 w-full border-[#dbe4ff] text-[#1a1aff]" onClick={() => navigate('/violations')}>
              View Rule Logs
            </Button>
          </div>
        </div>
      </div>

      <div className="qc-card">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[16px] font-semibold text-[#111827]">Recent Control Runs</h2>
          <p className="text-[13px] text-[#6b7280]">{`Showing last ${sortedRecentEntries.length} of ${entries.length} runs`}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-[#eef2f7] hover:bg-transparent">
              <TableHead className="h-12 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]">Date &amp; Time</TableHead>
              <TableHead className="h-12 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]">
                {isInHouseControl ? 'Protocol No.' : 'Lot Number'}
              </TableHead>
              <TableHead className="h-12 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]">OD Reading</TableHead>
              <TableHead className="h-12 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]">SD Deviation</TableHead>
              <TableHead className="h-12 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]">Status</TableHead>
              <TableHead className="h-12 text-right text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRecentEntries.map((entry) => {
              const zScore = statistics.sampleCount >= 2 && statistics.sd > 0
                ? calculateZScore(entry.odValue, statistics.mean, statistics.sd)
                : 0;
              const zScoreMeta = getZScoreTone(zScore);

              return (
                <TableRow key={entry.id} className="border-[#eef2f7] bg-white hover:bg-[#f8fafc]">
                  <TableCell className="py-4 text-[14px] text-[#111827]">{formatDateTimeLabel(getEntryTimestamp(entry))}</TableCell>
                  <TableCell className="py-4 text-[14px] text-[#374151]">
                    <div className="flex items-center gap-2">
                      <span className={isInHouseControl ? 'font-mono' : ''}>{isInHouseControl ? entry.protocolNumber : entry.lotNumber}</span>
                      {entry.signedBy && <LockIcon size={14} className="text-[#9ca3af]" />}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-[14px] font-medium text-[#111827]">
                    <div className="flex items-center gap-2">
                      <span>{entry.odValue.toFixed(4)}</span>
                      {entry.editedAt && <Badge className="bg-[#fef3c7] text-[#d97706]">Edited</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${zScoreMeta.tint}`}>
                      {`${zScore >= 0 ? '+' : ''}${zScore.toFixed(1)} SD`}
                    </span>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2 text-[14px] text-[#111827]">
                      <span className={`h-2.5 w-2.5 rounded-full ${zScoreMeta.dot}`} />
                      {zScoreMeta.status}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon-sm" className="text-[#94a3b8]">
                          <DotsThreeIcon size={16} />
                          <span className="sr-only">Open entry actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => setSelectedEntry(entry)}>View detail</DropdownMenuItem>
                        {canEditEntries && (
                          <DropdownMenuItem
                            disabled={isArchivedLot || entry.signedBy !== null}
                            onClick={() => setIsEditSheetOpen(true)}
                          >
                            Edit entry
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => downloadEntry(entry)}>
                          <DownloadIcon size={14} />
                          Download entry
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div className="mt-5 text-center">
          <button type="button" onClick={() => navigate('/history')} className="text-[14px] font-semibold text-[#1a1aff]">
            View All Analysis History
          </button>
        </div>
      </div>

      <Dialog open={isStartLotDialogOpen} onOpenChange={setIsStartLotDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Start new lot</DialogTitle>
            <DialogDescription>
              The current active lot will be archived and the new lot will become the working dataset for this control.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1C1C]">Lot Number</label>
              <Input
                value={newLotValues.lotNumber}
                onChange={(event) =>
                  setNewLotValues((currentValues) => ({
                    ...currentValues,
                    lotNumber: event.target.value,
                  }))
                }
                placeholder="Enter reagent lot number"
                className="h-11 border-[#dce4f2] bg-white px-3"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1C1C]">Start Date</label>
              <IsoDatePicker
                value={newLotValues.startDate}
                onChange={(value) =>
                  setNewLotValues((currentValues) => ({
                    ...currentValues,
                    startDate: value,
                  }))
                }
                displayFormat={settings.dateFormat}
                className="h-11 border-[#dce4f2] bg-white text-[#1A1C1C] hover:bg-[#F8FAFC]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1C1C]">Notes</label>
              <Textarea
                value={newLotValues.notes}
                onChange={(event) =>
                  setNewLotValues((currentValues) => ({
                    ...currentValues,
                    notes: event.target.value,
                  }))
                }
                rows={3}
                maxLength={200}
                placeholder="Optional notes for this lot"
                className="resize-none border-[#dce4f2] bg-white px-3 py-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsStartLotDialogOpen(false);
                setNewLotValues(createDefaultLotForm());
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateLot}>
              Start lot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedEntry !== null} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedEntry?.protocolNumber ?? 'Entry detail'}</DialogTitle>
            <DialogDescription>Review the selected QC entry details.</DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.05em] text-[#6b7280]">Date</p>
                <p className="mt-1 text-sm font-medium text-[#111827]">{formatDateLabel(selectedEntry.date)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.05em] text-[#6b7280]">OD Reading</p>
                <p className="mt-1 text-sm font-medium text-[#111827]">{selectedEntry.odValue.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.05em] text-[#6b7280]">Protocol No.</p>
                <p className="mt-1 text-sm font-medium text-[#111827]">{selectedEntry.protocolNumber}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.05em] text-[#6b7280]">Lot Number</p>
                <p className="mt-1 text-sm font-medium text-[#111827]">{selectedEntry.lotNumber}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[11px] uppercase tracking-[0.05em] text-[#6b7280]">Remarks</p>
                <p className="mt-1 text-sm font-medium text-[#111827]">{selectedEntry.notes ?? 'No remarks recorded.'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {canEditEntries && (
        <EditEntriesSheet
          entries={entries}
          mean={statistics.mean}
          sd={statistics.sd}
          open={isEditSheetOpen}
          onOpenChange={setIsEditSheetOpen}
          onSave={handleSaveEditedEntry}
        />
      )}

      {isLoading && (
        <div className="mt-4 text-sm text-[#6b7280]">Refreshing dataset...</div>
      )}
    </div>
  );
}
