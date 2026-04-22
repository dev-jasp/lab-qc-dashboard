import { useEffect, useMemo, useState } from 'react';
import { Download, FolderKanban, Lock, Pencil, PlusCircle } from 'lucide-react';

import LeveyJenningsChart from '@/components/chart/LeveyJenningsChart';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import Footer from '@/components/layout/Footer';
import { EditEntriesSheet } from '@/components/panels/EditEntriesSheet';
import InputPanel from '@/components/panels/InputPanel';
import QCRulesPanel from '@/components/panels/QCRulesPanel';
import StatisticsPanel from '@/components/panels/StatisticsPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IsoDatePicker } from '@/components/ui/IsoDatePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { addEntry, addViolation, createLot, getEntries, getLots, getSession, updateEntry } from '@/lib/qcStorage';
import type {
  AuditEntry,
  ControlTypeSlug,
  DiseaseSlug,
  EntryFormValues,
  LotMetadata,
  QCEntry,
  QCSession,
  QCRule,
  ViolationEntry,
} from '@/types/qc.types';
import { exportToCSV, validateODValue } from '@/utils/export';
import { calculateStatistics, evaluateQCRules } from '@/utils/qc-calculations';

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

function formatDisplayDate(value: string | null): string {
  if (!value) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
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

export default function QCDashboard({
  diseaseSlug,
  controlType,
  diseaseName,
  controlName,
  assayTag,
}: QCDashboardProps) {
  const isInHouseControl = controlType === 'in-house-control';
  const parameters = useMemo(() => getControlParameters(diseaseSlug, controlType), [diseaseSlug, controlType]);
  const [entries, setEntries] = useState<QCEntry[]>([]);
  const [lots, setLots] = useState<LotMetadata[]>([]);
  const [selectedLotNumber, setSelectedLotNumber] = useState<string>('');
  const [formValues, setFormValues] = useState<EntryFormValues>(createDefaultEntryForm);
  const [newLotValues, setNewLotValues] = useState<NewLotFormValues>(createDefaultLotForm);
  const [isStartLotDialogOpen, setIsStartLotDialogOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState<QCSession | null>(null);
  const { success, error } = useToast();

  const baseChartData = useMemo(() => entriesToChartData(entries), [entries]);
  const { statistics, qcRules, cvTrend, hasViolations } = useQCLogic(baseChartData, parameters);
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
  const currentLotLabel = isInHouseControl ? undefined : selectedLot?.lotNumber ?? selectedLotNumber;
  const canEditEntries = canUsePrivilegedActions(currentSession);
  const activeDatasetLotNumber = isInHouseControl ? DEFAULT_IN_HOUSE_LOT_NUMBER : selectedLotNumber;

  useEffect(() => {
    let isCancelled = false;

    const initializeMonitor = async () => {
      setIsLoading(true);

      try {
        await ensureControlDatasetInitialized(diseaseSlug, controlType);
        const session = await getSession();

        if (isInHouseControl) {
          const inHouseEntries = await getEntries(diseaseSlug, controlType);

          if (!isCancelled) {
            setCurrentSession(session);
            setLots([]);
            setSelectedLotNumber('');
            setEntries(inHouseEntries);
          }

          return;
        }

        const storedLots = await getLots(diseaseSlug, controlType);
        const nextSelectedLotNumber =
          storedLots.find((lot) => lot.lotNumber === selectedLotNumber)?.lotNumber ??
          storedLots.find((lot) => lot.status === 'active')?.lotNumber ??
          storedLots[0]?.lotNumber ??
          '';
        const selectedEntries =
          nextSelectedLotNumber.length > 0
            ? await getEntries(diseaseSlug, controlType, nextSelectedLotNumber)
            : [];

        if (!isCancelled) {
          setCurrentSession(session);
          setLots(storedLots);
          setSelectedLotNumber(nextSelectedLotNumber);
          setEntries(selectedEntries);
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

  const handleFieldChange = (field: keyof EntryFormValues, value: string) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleLotSelection = (lotNumber: string) => {
    setSelectedLotNumber(lotNumber);
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
      runNumber: '',
      vialNumber: '',
      flag: null,
      notes: formValues.remarks.trim() ? formValues.remarks.trim() : null,
      editedAt: null,
      editReason: null,
      signedBy: null,
      signedAt: null,
    };

    try {
      await addEntry(diseaseSlug, controlType, nextEntry, isInHouseControl ? undefined : datasetLotNumber);
      const updatedEntries = await getEntries(diseaseSlug, controlType, isInHouseControl ? undefined : datasetLotNumber);

      setEntries(updatedEntries);
      setFormValues(createDefaultEntryForm());
      success(`Run ${nextEntry.protocolNumber} recorded successfully.`);
    } catch (caughtError) {
      error(caughtError instanceof Error ? caughtError.message : 'Unable to save the QC entry.');
    }
  };

  const handleExport = () => {
    if (baseChartData.length === 0) {
      error('No data is available for export.');
      return;
    }

    exportToCSV(entries, statistics, parameters);
    success('Current dataset exported successfully.');
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

      const refreshedEntries = await getEntries(
        diseaseSlug,
        controlType,
        isInHouseControl ? undefined : activeDatasetLotNumber,
      );

      setEntries(refreshedEntries);
      success(`Entry ${entry.protocolNumber} updated — change logged in audit trail`);
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
      setIsStartLotDialogOpen(false);
      setNewLotValues(createDefaultLotForm());
      success(`Lot ${trimmedLotNumber} is now active.`);
    } catch (caughtError) {
      error(caughtError instanceof Error ? caughtError.message : 'Unable to start the new lot.');
    }
  };

  const monitorTitle = `${diseaseName} ${controlName}`;
  const monitorSubtitle = `${controlName.toUpperCase()} • ${diseaseName.toUpperCase()}${assayTag ? ` • ${assayTag}` : ''}`;

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <DashboardHeader activeTab="monitor" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#1A1C1C]">{monitorTitle}</h1>
          <p className="mt-1 text-sm text-[#64748B]">{monitorSubtitle}</p>
        </div>

        {!isInHouseControl && (
          <div className="mb-6 rounded-xl border border-[#F3F3F3] bg-white p-5 shadow">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">Lot Selector</p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Select value={selectedLotNumber} onValueChange={handleLotSelection}>
                    <SelectTrigger className="h-11 w-full min-w-0 justify-between rounded-lg border-[#DCE4F2] px-3 text-left sm:max-w-md">
                      <SelectValue placeholder="Select a lot" />
                    </SelectTrigger>
                    <SelectContent>
                      {lots.map((lot) => (
                        <SelectItem key={lot.lotNumber} value={lot.lotNumber}>
                          {`${lot.lotNumber} • ${lot.status === 'active' ? 'Active' : 'Archived'} • ${formatDisplayDate(lot.startDate)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedLot && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={selectedLot.status === 'active' ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#F3F4F6] text-[#6B7280]'}>
                        {selectedLot.status === 'active' ? 'Active' : 'Archived'}
                      </Badge>
                      <span className="text-sm text-[#64748B]">
                        Started {formatDisplayDate(selectedLot.startDate)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-11 border-[#DCE4F2] text-[#0000FF] hover:bg-[#EEF2FF]"
                onClick={() => setIsStartLotDialogOpen(true)}
              >
                <PlusCircle size={16} />
                Start new lot
              </Button>
            </div>
          </div>
        )}

        {isArchivedLot && (
          <div className="mb-6 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#475569] shadow-sm">
            This lot is archived. Data is read-only.
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
          <div className="h-full">
            {isArchivedLot ? (
              <div className="flex h-full flex-col justify-between rounded-xl border border-[#E5E7EB] bg-white p-6 shadow">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">Archived Dataset</p>
                  <h2 className="mt-2 text-2xl font-bold text-[#1A1C1C]">{selectedLot?.lotNumber}</h2>
                  <p className="mt-3 text-sm leading-6 text-[#64748B]">
                    Historical lot runs remain fully viewable for chart review, statistics checks, and report downloads.
                  </p>
                </div>

                <div className="mt-6 rounded-lg border border-[#E5EAF2] bg-[#F9F9F9] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">Archived Since</p>
                  <p className="mt-1 text-lg font-bold text-[#1A1C1C]">{formatDisplayDate(selectedLot?.endDate ?? null)}</p>
                </div>
              </div>
            ) : (
              <InputPanel
                formValues={formValues}
                onFieldChange={handleFieldChange}
                onAddOD={handleAddEntry}
                currentLotNumber={currentLotLabel}
              />
            )}
          </div>

          <div className="flex h-full flex-col rounded-xl border border-[#F3F3F3] bg-white p-5 shadow">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Current Status</p>
                <div className={`mt-1 text-2xl font-bold ${hasViolations ? 'text-[#B22222]' : 'text-[#0000FF]'}`}>
                  {hasViolations ? 'OUT OF CONTROL' : 'NORMAL'}
                </div>
              </div>
              <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${hasViolations ? 'bg-[#B22222]' : 'bg-[#0000FF]'}`} />
            </div>

            <p className="text-sm leading-6 text-[#64748B]">
              {hasViolations
                ? 'Violations detected in the latest review window. Inspect the selected dataset before proceeding.'
                : 'The selected dataset is operating within expected control limits based on the current run history.'}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-[#F3F3F3] bg-[#F9F9F9] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Last OD</p>
                <p className="mt-1 text-lg font-bold text-[#1A1C1C]">
                  {runStatistics.lastOD === null ? '-' : runStatistics.lastOD.toFixed(4)}
                </p>
              </div>
              <div className="rounded-lg border border-[#F3F3F3] bg-[#F9F9F9] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Runs</p>
                <p className="mt-1 text-lg font-bold text-[#1A1C1C]">{runStatistics.totalRuns}</p>
              </div>
              <div className="rounded-lg border border-[#F3F3F3] bg-[#F9F9F9] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">CV</p>
                <p className="mt-1 text-lg font-bold text-[#1A1C1C]">{runStatistics.cv.toFixed(2)}%</p>
              </div>
            </div>

            {!isInHouseControl && selectedLot && (
              <div className="mt-5 rounded-lg border border-[#E5EAF2] bg-[#F9FBFF] p-4">
                <div className="flex items-center gap-2">
                  <FolderKanban size={16} className="text-[#0000FF]" />
                  <p className="text-sm font-semibold text-[#1A1C1C]">Selected Lot Details</p>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-[#475569] sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Lot</p>
                    <p className="mt-1 font-semibold text-[#1A1C1C]">{selectedLot.lotNumber}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Start Date</p>
                    <p className="mt-1 font-semibold text-[#1A1C1C]">{formatDisplayDate(selectedLot.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Status</p>
                    <p className="mt-1 font-semibold text-[#1A1C1C]">{selectedLot.status === 'active' ? 'Active' : 'Archived'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <StatisticsPanel runStatistics={runStatistics} cvTrend={cvTrend} />
        </div>

        <div className="mb-8">
          <LeveyJenningsChart
            data={chartData}
            statistics={statistics}
            parameters={parameters}
            headerActions={
              canEditEntries ? (
                isArchivedLot ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled
                    title="Archived lots are read-only."
                    className="border-[#E5E7EB] text-[#64748B]"
                  >
                    <Lock size={14} />
                    Edit entries
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-[#DCE4F2] text-[#0000FF] hover:bg-[#EEF2FF]"
                    onClick={() => setIsEditSheetOpen(true)}
                  >
                    <Pencil size={14} />
                    Edit entries
                  </Button>
                )
              ) : null
            }
            badgeLabel={
              isInHouseControl
                ? `${chartData.length} runs`
                : `${selectedLot?.lotNumber || selectedLotNumber || 'No lot selected'}`
            }
          />
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-[#F3F3F3] px-4 py-2 text-sm font-medium text-[#64748B] transition-colors hover:bg-gray-100"
          >
            <Download size={16} />
            Download dataset
          </button>
          <div className="rounded-lg border border-[#F3F3F3] px-4 py-2 text-sm font-medium text-[#64748B]">
            {isLoading ? 'Refreshing dataset...' : `${chartData.length} plotted runs`}
          </div>
        </div>

        <div className="mb-8">
          <QCRulesPanel qcRules={qcRules} />
        </div>

        <div className="mb-8 rounded-xl border border-[#F3F3F3] bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-[#1A1C1C]">Recent Logs</h3>
          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#D9E2F1] bg-[#F9FBFF] px-4 py-6 text-sm text-[#64748B]">
                No runs have been recorded for this dataset yet.
              </div>
            ) : (
              [...entries]
                .slice(-5)
                .reverse()
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between border-b border-[#F3F3F3] py-2 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#1A1C1C]">{entry.date}</p>
                      <p className="text-xs text-[#64748B]">Protocol No. {entry.protocolNumber}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.editedAt && <Badge className="bg-[#FEF3C7] text-[#D97706]">Edited</Badge>}
                      <div className="text-sm font-semibold text-[#1A1C1C]">{entry.odValue.toFixed(4)}</div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        <Footer />
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
              <input
                type="text"
                value={newLotValues.lotNumber}
                onChange={(event) =>
                  setNewLotValues((currentValues) => ({
                    ...currentValues,
                    lotNumber: event.target.value,
                  }))
                }
                placeholder="Enter reagent lot number"
                className="w-full rounded-lg border border-[#DCE4F2] px-3 py-2 text-sm outline-none transition focus:border-[#0000FF]"
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
                className="border-[#DCE4F2] bg-white text-[#1A1C1C] hover:bg-[#F8FAFC]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1C1C]">Notes</label>
              <textarea
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
                className="w-full resize-none rounded-lg border border-[#DCE4F2] px-3 py-2 text-sm outline-none transition focus:border-[#0000FF]"
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

      {canEditEntries && !isArchivedLot && (
        <EditEntriesSheet
          entries={entries}
          mean={statistics.mean}
          sd={statistics.sd}
          open={isEditSheetOpen}
          onOpenChange={setIsEditSheetOpen}
          onSave={handleSaveEditedEntry}
        />
      )}
    </div>
  );
}
