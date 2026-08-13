import {
  CheckIcon,
  ClockIcon,
  DotsThreeIcon,
  DownloadIcon,
  DownloadSimpleIcon,
  LockIcon,
  PencilIcon,
  PlusCircleIcon,
  TrendDownIcon,
  TrendUpIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react";
import { format, parseISO } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import LeveyJenningsChart from "@/components/chart/LeveyJenningsChart";
import { ExportModal } from "@/components/export/ExportModal";
import { LotFormDialog } from "@/components/lots/LotFormDialog";
import { EditEntriesSheet } from "@/components/panels/EditEntriesSheet";
import { StaffFormDialog, type StaffFormValues } from "@/components/personnel/StaffFormDialog";
import { StaffNameLabel } from "@/components/personnel/StaffNameLabel";
import { RunFileDropzone } from "@/components/panels/RunFileDropzone";
import { StaffPicker } from "@/components/personnel/StaffPicker";
import { QCRulesReferenceCard } from "@/components/panels/QCRulesReferenceCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { IsoDatePicker } from "@/components/ui/IsoDatePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTROL_DEFINITIONS,
  DISEASE_DEFINITIONS,
} from "@/constants/monitor-config";
import { useQCLogic } from "@/hooks/useQCLogic";
import { useToast } from "@/hooks/useToast";
import { getUser, type AuthUser } from "@/lib/auth";
import type { LotFormValues } from "@/lib/lotValidation";
import type { ControlTabSlug } from "@/constants/monitor-config";
import {
  buildRunStatisticsSummary,
  DEFAULT_IN_HOUSE_LOT_NUMBER,
  ensureControlDatasetInitialized,
  entriesToChartData,
  getControlCode,
  getControlParameters,
} from "@/lib/qcMonitor";
import {
  addEntry,
  addViolation,
  createInHouseBatch,
  createLot,
  createStaffMember,
  getEntries,
  getInHouseBatches,
  getLots,
  getSettings,
  getStaff,
  getViolations,
  updateEntry,
} from "@/lib/qcStorage";
import { getReportYear } from "@/lib/reportPeriod";
import type { PrintableChartDataPoint } from "@/types/export";
import type {
  AuditEntry,
  ControlTypeSlug,
  DiseaseSlug,
  EntryFormValues,
  InHouseBatchMetadata,
  LotMetadata,
  QCEntry,
  QCEntryFlag,
  QCRule,
  QCSettings,
  StaffMember,
  ViolationEntry,
} from "@/types/qc.types";
import {
  calculateStatistics,
  calculateZScore,
  evaluateQCRules,
} from "@/utils/qc-calculations";
import {
  getDiseaseName,
  parseProtocolWorkbook,
  type ParsedRun,
} from "@/lib/protocolWorkbook";
import { findStaffByBenchName } from "@/lib/staffDirectory";
import { validateODValue } from "@/utils/export";

interface QCDashboardProps {
  diseaseSlug: DiseaseSlug;
  controlType: ControlTypeSlug;
  controlTabSlug: ControlTabSlug;
}

type MonitorStatus = "stable" | "normal" | "watchlist" | "out";

type RecentFlagItem = {
  id: string;
  icon: "warning" | "flag";
  label: string;
  secondary: string;
  severity: "warning" | "rejection" | "neutral";
  sortValue: string;
};

const DEFAULT_SETTINGS_FALLBACK: QCSettings = {
  labName: "Zamboanga City Medical Center",
  labSection: "Vaccine Preventable Disease Referral Laboratory (VPDRL)",
  labAddress: "Dr. D. Evangelista St. Sta. Catalina, 7000 Zamboanga City",
  defaultPreparedBy: "",
  defaultValidatedBy: "",
  cvAlertThreshold: 15,
  minDataPointsForWestgard: 10,
  dateFormat: "YYYY-MM-DD",
  recentLogsCount: 10,
  chartTheme: "light",
  defaultChartView: "daily",
  lotExpiryWarningDays: 30,
};

const MONITOR_REVEAL_EASE = [0.22, 1, 0.36, 1] as const;
const ENTRY_FIELD_CLASS_NAME =
  "h-11 border-[#e5e7eb] bg-white px-3 text-[#111827]";
const DATE_FIELD_CLASS_NAME =
  "h-11 border-[#e5e7eb] bg-white text-[#111827] hover:bg-[#f8fafc]";

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Seeds the entry form, pre-filling "Performed By" and "Validated By" from the
 * lab's defaults so they survive a submit instead of being retyped every run.
 */
function createDefaultEntryForm(
  staff: StaffMember[] = [],
  defaultPerformerId = "",
  defaultValidatorId = "",
): EntryFormValues {
  const performer = findActiveMember(staff, defaultPerformerId);
  // Defaulting both to the same person would seed a form that can never be
  // submitted, so the collision drops the validator rather than the performer.
  const validator =
    defaultValidatorId === defaultPerformerId
      ? null
      : findActiveMember(staff, defaultValidatorId);

  return {
    date: getTodayIsoDate(),
    odValue: "",
    protocolNumber: "",
    remarks: "",
    performedBy: performer?.displayName ?? "",
    performedById: performer?.id ?? "",
    validatedBy: validator?.displayName ?? "",
    validatedById: validator?.id ?? "",
  };
}

function findActiveMember(
  staff: StaffMember[],
  memberId: string,
): StaffMember | null {
  return staff.find((member) => member.id === memberId && member.isActive) ?? null;
}

/**
 * A reason the operator needs to see before an imported workbook fills the
 * form. `block` cannot be overridden; `confirm` asks; `warn` is stated and the
 * fill proceeds.
 */
type ImportIssue = { severity: "block" | "confirm" | "warn"; message: string };

type PendingImport = {
  run: ParsedRun;
  fileName: string;
  issues: ImportIssue[];
};

/** What the form was filled from, kept visible until the entry is submitted. */
type ImportProvenance = {
  fileName: string;
  controlLabel: string;
  wellNumber: number | null;
  odFromCachedValue: boolean;
};

function formatFieldList(fields: string[]): string {
  if (fields.length <= 1) {
    return fields.join("");
  }

  return `${fields.slice(0, -1).join(", ")} and ${fields[fields.length - 1]}`;
}

function getSelectedLot(
  lots: LotMetadata[],
  selectedLotNumber: string,
): LotMetadata | null {
  return lots.find((lot) => lot.lotNumber === selectedLotNumber) ?? null;
}

function getSelectedInHouseBatch(
  batches: InHouseBatchMetadata[],
  selectedBatchId: string,
): InHouseBatchMetadata | null {
  return batches.find((batch) => batch.batchId === selectedBatchId) ?? null;
}

function isPrivilegedRole(user: AuthUser | null): boolean {
  return user?.role === "Supervisor" || user?.role === "Admin";
}

function canUsePrivilegedActions(user: AuthUser | null): boolean {
  return isPrivilegedRole(user);
}

function getAuditActorLabel(user: AuthUser | null): string {
  if (user === null) {
    return "Local QC User";
  }

  return user.name;
}

function formatDateLabel(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  return format(parseISO(value), "MMM dd, yyyy");
}

function formatDateTimeLabel(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  const resolvedValue = value.includes("T") ? value : `${value}T08:00:00`;
  return format(new Date(resolvedValue), "MMM dd, hh:mm a");
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
  if (rules.some((rule) => rule.violated && rule.severity === "rejection")) {
    return "out";
  }

  if (
    rules.some((rule) => rule.violated && rule.severity === "warning") ||
    isHighCV ||
    isRisingCV
  ) {
    return "watchlist";
  }

  if (totalRuns >= minRunsForWestgard && totalRuns > 0) {
    return "stable";
  }

  return "normal";
}

function getMonitorStatusMeta(status: MonitorStatus) {
  if (status === "out") {
    return {
      badgeLabel: "OUT OF CONTROL",
      healthLabel: "Out of Control",
      badgeClassName: "bg-[#fee2e2] text-[#dc2626]",
      systemBadgeClassName: "bg-[#fee2e2] text-[#dc2626]",
      dotClassName: "bg-[#dc2626]",
      ringClassName: "border-[#dc2626] text-[#dc2626]",
      icon: XIcon,
    };
  }

  if (status === "watchlist") {
    return {
      badgeLabel: "WATCHLIST",
      healthLabel: "Watchlist",
      badgeClassName: "bg-[#fef3c7] text-[#d97706]",
      systemBadgeClassName: "bg-[#fef3c7] text-[#d97706]",
      dotClassName: "bg-[#d97706]",
      ringClassName: "border-[#d97706] text-[#d97706]",
      icon: WarningIcon,
    };
  }

  if (status === "stable") {
    return {
      badgeLabel: "STABLE",
      healthLabel: "Normal",
      badgeClassName: "bg-[#dcfce7] text-[#16a34a]",
      systemBadgeClassName: "bg-[#ccfbf1] text-[#0f766e]",
      dotClassName: "bg-[#16a34a]",
      ringClassName: "border-[#16a34a] text-[#16a34a]",
      icon: CheckIcon,
    };
  }

  return {
    badgeLabel: "NORMAL",
    healthLabel: "Normal",
    badgeClassName: "bg-[#dcfce7] text-[#16a34a]",
    systemBadgeClassName: "bg-[#dcfce7] text-[#16a34a]",
    dotClassName: "bg-[#16a34a]",
    ringClassName: "border-[#16a34a] text-[#16a34a]",
    icon: CheckIcon,
  };
}

function getZScoreTone(zScore: number) {
  const absoluteValue = Math.abs(zScore);

  if (absoluteValue > 3) {
    return {
      text: "#dc2626",
      tint: "bg-[#fee2e2] text-[#dc2626]",
      status: "Alert",
      dot: "bg-[#dc2626]",
    };
  }

  if (absoluteValue > 2) {
    return {
      text: "#d97706",
      tint: "bg-[#fef3c7] text-[#d97706]",
      status: "Watch",
      dot: "bg-[#d97706]",
    };
  }

  if (absoluteValue > 1) {
    return {
      text: "#16a34a",
      tint: "bg-[#dcfce7] text-[#16a34a]",
      status: "Valid",
      dot: "bg-[#16a34a]",
    };
  }

  return {
    text: "#1a1aff",
    tint: "bg-[#eff6ff] text-[#1a1aff]",
    status: "Valid",
    dot: "bg-[#0f766e]",
  };
}

function getFlagLabel(flag: QCEntryFlag): string {
  return flag
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildViolationEntries(
  entries: QCEntry[],
  rules: QCRule[],
  lotNumber: string,
): ViolationEntry[] {
  const timestamp = new Date().toISOString();

  return rules
    .filter(
      (rule) =>
        rule.violated &&
        rule.status === "violated" &&
        (rule.triggeringIndices?.length ?? 0) > 0,
    )
    .map((rule) => {
      const triggeringEntries = (rule.triggeringIndices ?? [])
        .map((index) => entries[index])
        .filter(Boolean);

      return {
        id: crypto.randomUUID(),
        timestamp,
        ruleName: rule.name,
        severity: rule.severity ?? "warning",
        triggeringProtocols: triggeringEntries.map(
          (entry) => entry.protocolNumber,
        ),
        triggeringODValues: triggeringEntries.map((entry) => entry.odValue),
        lotNumber,
        acknowledged: false,
        acknowledgedBy: null,
        acknowledgedAt: null,
        correctiveAction: null,
      };
    });
}

function buildRecentFlags(
  entries: QCEntry[],
  violations: ViolationEntry[],
): RecentFlagItem[] {
  const violationItems: RecentFlagItem[] = violations.map((violation) => ({
    id: violation.id,
    icon: "warning",
    label: `Rule ${violation.ruleName.replace("_", "-")}${violation.severity === "warning" ? " Warning" : " Rejection"}`,
    secondary: `${format(parseISO(violation.timestamp), "MMM dd")} - ${violation.triggeringProtocols[0] ?? "QC Run"}`,
    severity: violation.severity,
    sortValue: violation.timestamp,
  }));

  const flagItems: RecentFlagItem[] = entries
    .filter((entry) => entry.flag !== null)
    .map((entry) => ({
      id: `${entry.id}-flag`,
      icon: "flag",
      label: getFlagLabel(entry.flag as QCEntryFlag),
      secondary: `${formatDateLabel(entry.date)} - ${entry.protocolNumber}`,
      severity: "neutral",
      sortValue: getEntryTimestamp(entry),
    }));

  return [...violationItems, ...flagItems]
    .sort((left, right) => right.sortValue.localeCompare(left.sortValue))
    .slice(0, 3);
}

function downloadEntry(entry: QCEntry) {
  const payload = JSON.stringify(entry, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${entry.protocolNumber || entry.id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildSparklinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

export default function QCDashboard({
  diseaseSlug,
  controlType,
  controlTabSlug,
}: QCDashboardProps) {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const isInHouseControl = controlType === "in-house-control";
  const parameters = useMemo(
    () => getControlParameters(diseaseSlug, controlType),
    [diseaseSlug, controlType],
  );
  const [entries, setEntries] = useState<QCEntry[]>([]);
  const [violations, setViolations] = useState<ViolationEntry[]>([]);
  const [lots, setLots] = useState<LotMetadata[]>([]);
  const [inHouseBatches, setInHouseBatches] = useState<InHouseBatchMetadata[]>(
    [],
  );
  const [selectedLotNumber, setSelectedLotNumber] = useState("");
  const [selectedInHouseBatchId, setSelectedInHouseBatchId] = useState("");
  const [formValues, setFormValues] = useState<EntryFormValues>(() =>
    createDefaultEntryForm(),
  );
  const [settings, setSettings] = useState<QCSettings>(
    DEFAULT_SETTINGS_FALLBACK,
  );
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
  /** Which picker opened the quick-add dialog, so the new person lands there. */
  const [staffDialogTarget, setStaffDialogTarget] = useState<
    "performer" | "validator"
  >("performer");
  const [isStartLotDialogOpen, setIsStartLotDialogOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<"manual" | "upload">("manual");
  const [isParsingRunFile, setIsParsingRunFile] = useState(false);
  const [runFileError, setRunFileError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [importProvenance, setImportProvenance] =
    useState<ImportProvenance | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<QCEntry | null>(null);
  const { success, error } = useToast();

  const baseChartData = useMemo(() => entriesToChartData(entries), [entries]);
  const { statistics, qcRules, cvTrend } = useQCLogic(
    baseChartData,
    parameters,
  );
  const violationIndices = useMemo(
    () =>
      new Set(
        qcRules.flatMap((rule) =>
          rule.violated ? (rule.triggeringIndices ?? []) : [],
        ),
      ),
    [qcRules],
  );
  const chartData = useMemo(
    () =>
      baseChartData.map((point, index) => ({
        ...point,
        isViolation: violationIndices.has(index),
      })),
    [baseChartData, violationIndices],
  );
  const runStatistics = useMemo(
    () => buildRunStatisticsSummary(baseChartData, statistics),
    [baseChartData, statistics],
  );
  const selectedLot = useMemo(
    () => getSelectedLot(lots, selectedLotNumber),
    [lots, selectedLotNumber],
  );
  const selectedInHouseBatch = useMemo(
    () => getSelectedInHouseBatch(inHouseBatches, selectedInHouseBatchId),
    [inHouseBatches, selectedInHouseBatchId],
  );
  const isArchivedDataset = isInHouseControl
    ? selectedInHouseBatch?.status === "archived"
    : selectedLot?.status === "archived";
  const canEditEntries = canUsePrivilegedActions(currentUser);
  const activeDatasetLotNumber = isInHouseControl
    ? selectedInHouseBatchId
    : selectedLotNumber;
  const currentCV = cvTrend.currentCV ?? 0;
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
    Number.isFinite(liveODNumber) &&
    statistics.sampleCount >= 2 &&
    statistics.sd > 0
      ? calculateZScore(liveODNumber, statistics.mean, statistics.sd)
      : null;
  const recentFlags = useMemo(
    () => buildRecentFlags(entries, violations),
    [entries, violations],
  );
  const sortedRecentEntries = useMemo(
    () =>
      [...entries]
        .sort((left, right) =>
          getEntryTimestamp(right).localeCompare(getEntryTimestamp(left)),
        )
        .slice(0, settings.recentLogsCount),
    [entries, settings.recentLogsCount],
  );

  const nextDisease = useMemo(() => {
    const diseaseIndex = DISEASE_DEFINITIONS.findIndex(
      (disease) => disease.slug === diseaseSlug,
    );
    return diseaseIndex >= 0
      ? (DISEASE_DEFINITIONS[diseaseIndex + 1] ?? null)
      : null;
  }, [diseaseSlug]);

  const diseaseDefinition = useMemo(
    () => DISEASE_DEFINITIONS.find((disease) => disease.slug === diseaseSlug),
    [diseaseSlug],
  );
  const controlDefinition = useMemo(
    () => CONTROL_DEFINITIONS.find((control) => control.slug === controlType),
    [controlType],
  );
  const printableChartData = useMemo<PrintableChartDataPoint[]>(
    () =>
      entries.map((entry, index) => ({
        date: entry.date,
        odValue: entry.odValue,
        protocolNumber: entry.protocolNumber,
        runIndex: index + 1,
      })),
    [entries],
  );
  const exportDiseaseLabel = (
    diseaseDefinition?.name ?? diseaseSlug
  ).toUpperCase();
  const exportControlTypeLabel = (
    controlDefinition?.label ?? controlType
  ).toUpperCase();
  const exportControlLabel = getControlCode(controlType);
  const exportLotNumber = isInHouseControl ? undefined : selectedLotNumber;
  const exportYear = getReportYear(entries.map((entry) => entry.date));

  useEffect(() => {
    let isCancelled = false;

    const initializeMonitor = async () => {
      setIsLoading(true);

      try {
        await ensureControlDatasetInitialized(diseaseSlug, controlType);
        const [authUser, appSettings, staffRoster] = await Promise.all([
          getUser(),
          getSettings(),
          getStaff(),
        ]);

        if (isCancelled) {
          return;
        }

        setCurrentUser(authUser);
        setSettings(appSettings);
        setStaff(staffRoster);
        // Seed "Performed By" from the lab default, but never clobber a
        // selection the operator has already made.
        setFormValues((current) =>
          current.performedById === ""
            ? createDefaultEntryForm(
                staffRoster,
                appSettings.defaultPreparedBy,
                appSettings.defaultValidatedBy,
              )
            : current,
        );

        if (isInHouseControl) {
          const storedBatches = await getInHouseBatches(diseaseSlug);
          const nextSelectedBatchId =
            storedBatches.find(
              (batch) => batch.batchId === selectedInHouseBatchId,
            )?.batchId ??
            storedBatches.find((batch) => batch.status === "active")?.batchId ??
            storedBatches[0]?.batchId ??
            DEFAULT_IN_HOUSE_LOT_NUMBER;

          const [inHouseEntries, inHouseViolations] = await Promise.all([
            getEntries(diseaseSlug, controlType, nextSelectedBatchId),
            getViolations(diseaseSlug, controlType, nextSelectedBatchId),
          ]);

          if (!isCancelled) {
            setEntries(inHouseEntries);
            setViolations(inHouseViolations);
            setInHouseBatches(storedBatches);
            setSelectedInHouseBatchId(nextSelectedBatchId);
            setLots([]);
            setSelectedLotNumber("");
          }

          return;
        }

        const storedLots = await getLots(diseaseSlug, controlType);
        const nextSelectedLotNumber =
          storedLots.find((lot) => lot.lotNumber === selectedLotNumber)
            ?.lotNumber ??
          storedLots.find((lot) => lot.status === "active")?.lotNumber ??
          storedLots[0]?.lotNumber ??
          "";

        const [selectedEntries, selectedViolations] =
          nextSelectedLotNumber.length > 0
            ? await Promise.all([
                getEntries(diseaseSlug, controlType, nextSelectedLotNumber),
                getViolations(diseaseSlug, controlType, nextSelectedLotNumber),
              ])
            : [[], []];

        if (!isCancelled) {
          setLots(storedLots);
          setInHouseBatches([]);
          setSelectedInHouseBatchId("");
          setSelectedLotNumber(nextSelectedLotNumber);
          setEntries(selectedEntries);
          setViolations(selectedViolations);
        }
      } catch (caughtError) {
        if (!isCancelled) {
          error(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load QC monitor data.",
          );
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
  }, [
    controlType,
    diseaseSlug,
    error,
    isInHouseControl,
    selectedInHouseBatchId,
    selectedLotNumber,
  ]);

  const refreshViolationsEvent = () => {
    window.dispatchEvent(new CustomEvent("qc-violations-changed"));
  };

  const handleFieldChange = (field: keyof EntryFormValues, value: string) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  /**
   * Quick-add from inside either attribution picker: create the person, then
   * select them straight away — into whichever picker opened the dialog — so
   * the operator is not sent to another page mid-run.
   */
  const handleQuickAddStaff = async (values: StaffFormValues): Promise<boolean> => {
    const newMember: StaffMember = {
      id: crypto.randomUUID(),
      staffId: values.staffId,
      displayName: values.displayName,
      initials: values.initials,
      role: values.role,
      contactNumber: values.contactNumber ? values.contactNumber : null,
      email: values.email ? values.email : null,
      photoUrl: values.photoUrl ? values.photoUrl : null,
      shift: values.shift,
      dutyDays: values.dutyDays,
      isActive: true,
      notes: values.notes ? values.notes : null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };

    try {
      await createStaffMember(newMember);
      setStaff(await getStaff());
      setFormValues((current) =>
        staffDialogTarget === "validator"
          ? {
              ...current,
              validatedBy: newMember.displayName,
              validatedById: newMember.id,
            }
          : {
              ...current,
              performedBy: newMember.displayName,
              performedById: newMember.id,
            },
      );
      success(`${newMember.displayName} added to the roster.`);
      return true;
    } catch (caughtError) {
      error(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to add the personnel record.",
      );
      return false;
    }
  };

  /** Fields the import owns, listed only when the operator already typed there. */
  const describeOverwrites = (run: ParsedRun): string[] => {
    const fields: string[] = [];

    if (
      formValues.odValue.trim() !== "" &&
      Number(formValues.odValue) !== run.odValue
    ) {
      fields.push("OD value");
    }

    if (
      formValues.protocolNumber.trim() !== "" &&
      formValues.protocolNumber.trim() !== run.protocolNumber
    ) {
      fields.push("protocol number");
    }

    if (formValues.remarks.trim() !== "") {
      fields.push("remarks");
    }

    return fields;
  };

  const collectImportIssues = (run: ParsedRun): ImportIssue[] => {
    const issues: ImportIssue[] = [];

    if (run.disease !== diseaseSlug) {
      issues.push({
        severity: "block",
        message: `This is a ${getDiseaseName(run.disease)} protocol, but you are recording ${getDiseaseName(diseaseSlug)}.`,
      });
    }

    if (entries.some((entry) => entry.protocolNumber === run.protocolNumber)) {
      issues.push({
        severity: "block",
        message: `Protocol ${run.protocolNumber} is already recorded in this dataset.`,
      });
    }

    // In-house datasets are keyed by batch, not by the reagent kit lot the
    // workbook carries, so the two are not comparable.
    if (
      !isInHouseControl &&
      activeDatasetLotNumber &&
      run.lotNumber !== activeDatasetLotNumber
    ) {
      issues.push({
        severity: "confirm",
        message: `This run used lot ${run.lotNumber}, but you are recording into ${activeDatasetLotNumber}.`,
      });
    }

    const overwrites = describeOverwrites(run);

    if (overwrites.length > 0) {
      issues.push({
        severity: "confirm",
        message: `This replaces the ${formatFieldList(overwrites)} you already entered.`,
      });
    }

    if (run.expiryDate !== null && run.expiryDate < run.date) {
      issues.push({
        severity: "warn",
        message: `Lot ${run.lotNumber} expired on ${run.expiryDate}, before this run on ${run.date}.`,
      });
    }

    if (run.odFromCachedValue) {
      issues.push({
        severity: "warn",
        message:
          "The OD came from a cached formula result because its source cell could not be resolved. Check it against the worksheet.",
      });
    }

    if (
      run.performedBy !== null &&
      findStaffByBenchName(staff, run.performedBy) === null
    ) {
      issues.push({
        severity: "warn",
        message: `"${run.performedBy}" is not on the roster, so Performed By is left empty.`,
      });
    }

    if (
      run.validatedBy !== null &&
      findStaffByBenchName(staff, run.validatedBy) === null
    ) {
      issues.push({
        severity: "warn",
        message: `"${run.validatedBy}" is not on the roster, so Validated By is left empty.`,
      });
    }

    return issues;
  };

  const applyParsedRun = (run: ParsedRun, fileName: string) => {
    const performer =
      run.performedBy === null ? null : findStaffByBenchName(staff, run.performedBy);
    const validator =
      run.validatedBy === null ? null : findStaffByBenchName(staff, run.validatedBy);
    // A workbook naming one person for both roles would seed a form that
    // cannot be submitted, so the validator gives way.
    const resolvedValidator =
      validator !== null && validator.id === performer?.id ? null : validator;

    setFormValues((current) => ({
      ...current,
      date: run.date,
      odValue: String(run.odValue),
      protocolNumber: run.protocolNumber,
      remarks: `Imported from ${fileName}`,
      performedBy: performer?.displayName ?? "",
      performedById: performer?.id ?? "",
      validatedBy: resolvedValidator?.displayName ?? "",
      validatedById: resolvedValidator?.id ?? "",
    }));

    setImportProvenance({
      fileName,
      controlLabel: run.controlLabel,
      wellNumber: run.wellNumber,
      odFromCachedValue: run.odFromCachedValue,
    });
    setPendingImport(null);
    setRunFileError(null);
    setEntryMode("manual");
  };

  const handleRunFile = async (file: File) => {
    setIsParsingRunFile(true);
    setRunFileError(null);

    try {
      const result = await parseProtocolWorkbook(
        await file.arrayBuffer(),
        controlType,
      );

      if (!result.ok) {
        setRunFileError(result.error);
        return;
      }

      const issues = collectImportIssues(result.run);

      if (issues.length === 0) {
        applyParsedRun(result.run, file.name);
        return;
      }

      setPendingImport({ run: result.run, fileName: file.name, issues });
    } catch (caughtError) {
      setRunFileError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to read that file.",
      );
    } finally {
      setIsParsingRunFile(false);
    }
  };

  const clearImportProvenance = () => {
    setImportProvenance(null);
    setFormValues(
      createDefaultEntryForm(
        staff,
        settings.defaultPreparedBy,
        settings.defaultValidatedBy,
      ),
    );
  };

  const isImportBlocked =
    pendingImport?.issues.some((issue) => issue.severity === "block") ?? false;

  const handleAddEntry = async () => {
    const datasetLotNumber = activeDatasetLotNumber;

    if (!formValues.date) {
      error("Date is required.");
      return;
    }

    if (!formValues.protocolNumber.trim()) {
      error("Protocol number is required.");
      return;
    }

    if (!formValues.performedById) {
      error("Select who performed this run.");
      return;
    }

    if (!formValues.validatedById) {
      error("Select who validated this run.");
      return;
    }

    if (formValues.validatedById === formValues.performedById) {
      error("The validator must be someone other than the performer.");
      return;
    }

    if (!datasetLotNumber) {
      error(
        isInHouseControl
          ? "Select an active in-house batch before adding entries."
          : "Select an active lot before adding entries.",
      );
      return;
    }

    const odValidation = validateODValue(formValues.odValue);

    if (!odValidation.isValid) {
      error(odValidation.error ?? "Please enter a valid OD value.");
      return;
    }

    const nextEntry: QCEntry = {
      id: crypto.randomUUID(),
      date: formValues.date,
      protocolNumber: formValues.protocolNumber.trim(),
      odValue: Number.parseFloat(formValues.odValue),
      lotNumber: datasetLotNumber,
      controlCode: getControlCode(controlType),
      runNumber: String(entries.length + 1).padStart(2, "0"),
      vialNumber: `V${String(entries.length + 1).padStart(2, "0")}`,
      performedBy: formValues.performedBy.trim(),
      performedById: formValues.performedById,
      validatedBy: formValues.validatedBy.trim(),
      validatedById: formValues.validatedById,
      flag: null,
      notes: formValues.remarks.trim() ? formValues.remarks.trim() : null,
      editedAt: null,
      editReason: null,
      signedBy: null,
      signedAt: null,
    };

    setIsSubmitting(true);

    try {
      await addEntry(diseaseSlug, controlType, nextEntry, datasetLotNumber);

      const updatedEntries = await getEntries(
        diseaseSlug,
        controlType,
        datasetLotNumber,
      );
      const recalculatedChartData = entriesToChartData(updatedEntries);
      const recalculatedStatistics = calculateStatistics(recalculatedChartData);
      const recalculatedRules = evaluateQCRules(
        recalculatedChartData,
        recalculatedStatistics,
        parameters,
      );
      const potentialViolations = buildViolationEntries(
        updatedEntries,
        recalculatedRules,
        nextEntry.lotNumber,
      );

      for (const violation of potentialViolations) {
        await addViolation(
          diseaseSlug,
          controlType,
          violation,
          datasetLotNumber,
        );
      }

      const updatedViolations = await getViolations(
        diseaseSlug,
        controlType,
        datasetLotNumber,
      );

      setEntries(updatedEntries);
      setViolations(updatedViolations);
      setFormValues(createDefaultEntryForm(
          staff,
          settings.defaultPreparedBy,
          settings.defaultValidatedBy,
        ));
      setImportProvenance(null);
      setHasSubmitted(true);
      success("Entry recorded successfully");
      refreshViolationsEvent();
    } catch (caughtError) {
      error(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save the QC entry.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEditedEntry = async (
    entry: QCEntry,
    odValue: number,
    protocolNumber: string,
    reason: string,
  ) => {
    if (!canEditEntries) {
      const message = "Only Supervisor and Admin roles can edit QC entries.";
      error(message);
      throw new Error(message);
    }

    if (isArchivedDataset) {
      const message = isInHouseControl
        ? "Archived in-house batches are read-only and cannot be edited."
        : "Archived lots are read-only and cannot be edited.";
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
      protocolNumber,
      odValue,
      editedAt: timestamp,
      editReason: reason,
    };
    const auditEntry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp,
      action: "EDIT",
      performedBy: getAuditActorLabel(currentUser),
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
        activeDatasetLotNumber,
      );

      const updatedEntries = entries.map((currentEntry) =>
        currentEntry.id === entry.id ? updatedEntry : currentEntry,
      );
      const recalculatedChartData = entriesToChartData(updatedEntries);
      const recalculatedStatistics = calculateStatistics(recalculatedChartData);
      const recalculatedRules = evaluateQCRules(
        recalculatedChartData,
        recalculatedStatistics,
        parameters,
      );
      const potentialViolations = buildViolationEntries(
        updatedEntries,
        recalculatedRules,
        updatedEntry.lotNumber,
      );

      for (const violation of potentialViolations) {
        await addViolation(
          diseaseSlug,
          controlType,
          violation,
          activeDatasetLotNumber,
        );
      }

      const [refreshedEntries, refreshedViolations] = await Promise.all([
        getEntries(diseaseSlug, controlType, activeDatasetLotNumber),
        getViolations(diseaseSlug, controlType, activeDatasetLotNumber),
      ]);

      setEntries(refreshedEntries);
      setViolations(refreshedViolations);
      success(
        `Entry ${updatedEntry.protocolNumber} updated and logged in the audit trail.`,
      );
      refreshViolationsEvent();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update the QC entry.";
      error(message);
      throw new Error(message);
    }
  };

  const handleCreateLot = async (values: LotFormValues): Promise<boolean> => {
    const trimmedLotNumber = values.lotNumber;
    const trimmedNotes = values.notes ? values.notes : null;

    try {
      if (isInHouseControl) {
        await createInHouseBatch(diseaseSlug, {
          batchId: trimmedLotNumber,
          startDate: values.startDate,
          endDate: null,
          status: "active",
          notes: trimmedNotes,
        });

        const updatedBatches = await getInHouseBatches(diseaseSlug);
        const updatedEntries = await getEntries(
          diseaseSlug,
          controlType,
          trimmedLotNumber,
        );

        setInHouseBatches(updatedBatches);
        setSelectedInHouseBatchId(trimmedLotNumber);
        setEntries(updatedEntries);
        setViolations([]);
        setFormValues(createDefaultEntryForm(
          staff,
          settings.defaultPreparedBy,
          settings.defaultValidatedBy,
        ));
        success(`In-house batch ${trimmedLotNumber} is now active.`);
        refreshViolationsEvent();
        return true;
      }

      await createLot(diseaseSlug, controlType, {
        lotNumber: trimmedLotNumber,
        startDate: values.startDate,
        endDate: null,
        expiryDate: values.expiryDate,
        status: "active",
        notes: trimmedNotes,
      });

      const updatedLots = await getLots(diseaseSlug, controlType);
      const updatedEntries = await getEntries(
        diseaseSlug,
        controlType,
        trimmedLotNumber,
      );

      setLots(updatedLots);
      setSelectedLotNumber(trimmedLotNumber);
      setEntries(updatedEntries);
      setViolations([]);
      success(`Lot ${trimmedLotNumber} is now active.`);
      return true;
    } catch (caughtError) {
      error(
        caughtError instanceof Error
          ? caughtError.message
          : isInHouseControl
            ? "Unable to start the new in-house batch."
            : "Unable to start the new lot.",
      );
      return false;
    }
  };

  const chartTrendDelta =
    cvTrend.rollingCV.length >= 2
      ? cvTrend.rollingCV[cvTrend.rollingCV.length - 1].value -
        cvTrend.rollingCV[cvTrend.rollingCV.length - 2].value
      : 0;
  const trendDirection = chartTrendDelta <= 0 ? "down" : "up";
  const trendPath = buildSparklinePath(cvTrend.sparklinePoints);
  const trendAreaPath =
    cvTrend.sparklinePoints.length > 0
      ? `${trendPath} L ${cvTrend.sparklinePoints[cvTrend.sparklinePoints.length - 1].x} 80 L ${cvTrend.sparklinePoints[0].x} 80 Z`
      : "";
  const getRevealProps = (order: number) => ({
    initial: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 10,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
    transition: {
      delay: prefersReducedMotion ? 0 : order * 0.06,
      duration: prefersReducedMotion ? 0.01 : 0.32,
      ease: MONITOR_REVEAL_EASE,
    },
  });

  return (
    <div>
      <motion.div {...getRevealProps(0)} className="qc-card mb-6 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
              {isInHouseControl ? "Active In-house Batch" : "Active Lot"}
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              {isInHouseControl ? (
                <Select
                  value={selectedInHouseBatchId}
                  onValueChange={setSelectedInHouseBatchId}
                >
                  <SelectTrigger className="h-11 w-full border-[#e5e7eb] bg-white sm:w-80">
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <SelectValue placeholder="Select in-house batch" />
                      {selectedInHouseBatch && (
                        <Badge
                          className={
                            selectedInHouseBatch.status === "active"
                              ? "h-5 bg-[#dcfce7] px-2.5 text-[#16a34a]"
                              : "h-5 bg-[#f3f4f6] px-2.5 text-[#6b7280]"
                          }
                        >
                          {selectedInHouseBatch.status === "active"
                            ? "Active"
                            : "Archived"}
                        </Badge>
                      )}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {inHouseBatches.map((batch) => (
                      <SelectItem key={batch.batchId} value={batch.batchId}>
                        {batch.batchId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={selectedLotNumber}
                  onValueChange={setSelectedLotNumber}
                >
                  <SelectTrigger className="h-11 w-full border-[#e5e7eb] bg-white sm:w-80">
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <SelectValue placeholder="Select reagent lot" />
                      {selectedLot && (
                        <Badge
                          className={
                            selectedLot.status === "active"
                              ? "h-5 bg-[#dcfce7] px-2.5 text-[#16a34a]"
                              : "h-5 bg-[#f3f4f6] px-2.5 text-[#6b7280]"
                          }
                        >
                          {selectedLot.status === "active"
                            ? "Active"
                            : "Archived"}
                        </Badge>
                      )}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {lots.map((lot) => (
                      <SelectItem key={lot.lotNumber} value={lot.lotNumber}>
                        {lot.lotNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {isInHouseControl && selectedInHouseBatch && (
                <div className="text-sm text-[#6b7280]">
                  <span>
                    Started {formatDateLabel(selectedInHouseBatch.startDate)}
                  </span>
                </div>
              )}

              {!isInHouseControl && selectedLot && (
                <div className="text-sm text-[#6b7280]">
                  <span>Started {formatDateLabel(selectedLot.startDate)}</span>
                </div>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-11 border-[#dbe4ff] text-[#1a1aff]"
            onClick={() => setIsStartLotDialogOpen(true)}
          >
            <PlusCircleIcon size={16} />
            {isInHouseControl ? "Start new in-house batch" : "Start new lot"}
          </Button>
        </div>
      </motion.div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div
          {...getRevealProps(3)}
          className="qc-card order-1 flex flex-col lg:order-3 lg:col-span-1"
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-semibold text-[#111827]">
                  New QC Entry
                </h2>
                {isArchivedDataset && (
                  <Badge className="h-5 shrink-0 bg-[#f3f4f6] px-2.5 text-[#6b7280]">
                    Read-only
                  </Badge>
                )}
              </div>
              {isArchivedDataset && (
                <p className="mt-1 text-[12px] text-[#6b7280]">
                  {isInHouseControl
                    ? "Select the active batch or start a new batch to continue recording."
                    : "Select an active lot or start a new lot to continue recording."}
                </p>
              )}
            </div>

            {!isArchivedDataset && (
              <button
                type="button"
                onClick={() => {
                  setRunFileError(null);
                  setEntryMode((current) =>
                    current === "upload" ? "manual" : "upload",
                  );
                }}
                className="shrink-0 text-[12px] font-semibold text-[#6b7280] underline-offset-4 transition-colors hover:text-[#1a1aff] hover:underline"
              >
                {entryMode === "upload" ? "Enter manually" : "Upload run file"}
              </button>
            )}
          </div>

          {/*
            The card is stretched to its grid row by the chart beside it, so
            the dropzone fills that height rather than leaving the rest of the
            card blank. A fixed floor here would instead pad the manual form.
          */}
          <div className="flex flex-1 flex-col">
          {entryMode === "upload" ? (
            <RunFileDropzone
              onFile={(file) => void handleRunFile(file)}
              isBusy={isParsingRunFile}
              error={runFileError}
              disabled={isArchivedDataset}
            />
          ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleAddEntry();
            }}
            className="flex flex-1 flex-col gap-4"
          >
            {importProvenance !== null && (
              <div className="flex items-start justify-between gap-3 rounded-lg border border-[#dbe4ff] bg-[#f5f7ff] px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-[#1a1aff]">
                    {`Loaded from ${importProvenance.fileName}`}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#6b7280]">
                    {[
                      importProvenance.controlLabel,
                      importProvenance.wellNumber === null
                        ? null
                        : `well ${importProvenance.wellNumber}`,
                      importProvenance.odFromCachedValue
                        ? "OD from cached value"
                        : null,
                    ]
                      .filter((part) => part !== null)
                      .join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearImportProvenance}
                  aria-label="Clear the imported values"
                  className="shrink-0 text-[16px] leading-none text-[#9ca3af] transition-colors hover:text-[#111827]"
                >
                  ×
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-2">
              <div className="space-y-2 lg:order-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
                  Date
                </label>
                <IsoDatePicker
                  value={formValues.date}
                  onChange={(value) => handleFieldChange("date", value)}
                  disabled={isArchivedDataset}
                  displayFormat={settings.dateFormat}
                  className={DATE_FIELD_CLASS_NAME}
                />
              </div>

              <div className="space-y-2 lg:order-3 lg:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
                  OD Value (ABS)
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="0.0000"
                  value={formValues.odValue}
                  disabled={isArchivedDataset}
                  onChange={(event) =>
                    handleFieldChange("odValue", event.target.value)
                  }
                  className={ENTRY_FIELD_CLASS_NAME}
                />
                {liveZScore !== null && (
                  <p
                    className="text-[11px] font-medium"
                    style={{ color: getZScoreTone(liveZScore).text }}
                  >
                    {`Z: ${liveZScore >= 0 ? "+" : ""}${liveZScore.toFixed(2)}`}
                  </p>
                )}
              </div>

              <div className="space-y-2 lg:order-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
                  Protocol No.
                </label>
                <Input
                  placeholder="Enter protocol number"
                  value={formValues.protocolNumber}
                  disabled={isArchivedDataset}
                  onChange={(event) =>
                    handleFieldChange("protocolNumber", event.target.value)
                  }
                  className={ENTRY_FIELD_CLASS_NAME}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
                Remarks
              </label>
              <Textarea
                placeholder="Optional remarks"
                value={formValues.remarks}
                disabled={isArchivedDataset}
                maxLength={200}
                onChange={(event) =>
                  handleFieldChange("remarks", event.target.value)
                }
                className="min-h-[4.75rem] resize-none border-[#e5e7eb] bg-white px-3 py-2 text-[#111827]"
              />
            </div>

            {/*
              The two attribution pickers pair up wherever there is room. At lg
              this card is a third of the row, which leaves each one too narrow
              to read a name in, so they stack there and pair again at xl.
            */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
                  PERFORMED BY
                </label>
                <StaffPicker
                  staff={staff}
                  valueId={formValues.performedById}
                  disabled={isArchivedDataset}
                  onChange={(member) =>
                    setFormValues((current) => ({
                      ...current,
                      performedBy: member?.displayName ?? "",
                      performedById: member?.id ?? "",
                    }))
                  }
                  onQuickAdd={() => {
                    setStaffDialogTarget("performer");
                    setIsStaffDialogOpen(true);
                  }}
                  className={ENTRY_FIELD_CLASS_NAME}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
                  VALIDATED BY
                </label>
                <StaffPicker
                  staff={staff}
                  valueId={formValues.validatedById}
                  disabled={isArchivedDataset}
                  placeholder="Select who attested this"
                  onChange={(member) =>
                    setFormValues((current) => ({
                      ...current,
                      validatedBy: member?.displayName ?? "",
                      validatedById: member?.id ?? "",
                    }))
                  }
                  onQuickAdd={() => {
                    setStaffDialogTarget("validator");
                    setIsStaffDialogOpen(true);
                  }}
                  className={ENTRY_FIELD_CLASS_NAME}
                />
              </div>
            </div>

            {/*
              Anchored to the bottom of the card, which the chart beside it
              stretches taller than this form needs.
            */}
            <Button
              type="submit"
              disabled={isArchivedDataset || isSubmitting}
              className="mt-auto h-11 w-full rounded-lg bg-[#1a1aff] text-sm font-semibold text-white hover:bg-[#1515cc]"
            >
              {isSubmitting ? "Submitting..." : "Submit Recording"}
            </Button>

            {hasSubmitted && (
              <div>
                {nextDisease ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full border-[#dbe4ff] text-[#1a1aff]"
                    onClick={() =>
                      navigate(`/monitor/${nextDisease.slug}/${controlTabSlug}`)
                    }
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
          )}
          </div>
        </motion.div>

        <motion.div
          {...getRevealProps(1)}
          className="qc-card order-2 px-5 py-4 lg:order-1 lg:col-span-3"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 className="text-[16px] font-semibold text-[#111827]">
              System Health and Run Statistics
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(15rem,0.75fr)_minmax(0,2.25fr)]">
            <div className="flex flex-col lg:border-r lg:border-[#e5e7eb] lg:pr-6">
              <div className="flex flex-1 items-center justify-center lg:justify-start">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 ${monitorStatusMeta.ringClassName}`}
                  >
                    <MonitorStatusIcon size={26} />
                  </div>
                  <div className="text-left">
                    <p className="text-[28px] font-bold text-[#111827]">
                      {monitorStatusMeta.healthLabel}
                    </p>
                    <p className="text-[13px] text-[#6b7280]">
                      {`Last entry validated: ${entries.length > 0 ? formatDateTimeLabel(getEntryTimestamp(entries[entries.length - 1])) : "No entries yet"}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <div className="overflow-hidden rounded-lg bg-white">
                <div className="grid w-full grid-cols-2 justify-items-center md:grid-cols-3 xl:grid-cols-6">
                  {[
                    {
                      label: "MEAN",
                      value: runStatistics.mean.toFixed(3),
                    },
                    { label: "SD", value: runStatistics.sd.toFixed(3) },
                    {
                      label: "SUM",
                      value: runStatistics.sum.toFixed(3),
                    },
                    {
                      label: "CONFIDENCE",
                      value: `${runStatistics.confidence.toFixed(0)}%`,
                    },
                    {
                      label: "CV %",
                      value: `${runStatistics.cv.toFixed(2)}%`,
                      isEmphasized: true,
                    },
                    {
                      label: "LAST OD",
                      value:
                        runStatistics.lastOD === null
                          ? "-"
                          : runStatistics.lastOD.toFixed(4),
                      isEmphasized: true,
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="min-w-0 py-1 text-left xl:border-l xl:border-[#e5e7eb] xl:first:border-l-0 xl:pl-5 xl:first:pl-0"
                    >
                      <p className="text-[11px] uppercase tracking-[0.05em] text-[#6b7280]">
                        {stat.label}
                      </p>
                      <p
                        className={`mt-2 text-[22px] font-bold leading-none ${
                          stat.isEmphasized
                            ? "text-[#1a1aff]"
                            : "text-[#111827]"
                        }`}
                      >
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          {...getRevealProps(3)}
          className="order-3 lg:order-2 lg:col-span-2"
        >
          <LeveyJenningsChart
            data={chartData}
            statistics={statistics}
            parameters={parameters}
            title="Levey-Jennings Quality Control Chart"
            height={440}
            headerActions={
              <div className="flex items-center gap-2">
                {canEditEntries && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-[#dbe4ff] text-[#1f3d87]"
                    onClick={() => setIsEditSheetOpen(true)}
                    disabled={isArchivedDataset}
                  >
                    <PencilIcon size={14} />
                    Edit entries
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-[#dbe4ff] text-[#1f3d87]"
                  onClick={() => setIsExportModalOpen(true)}
                  disabled={entries.length === 0}
                >
                  <DownloadSimpleIcon size={15} />
                  Export / Print
                </Button>
              </div>
            }
            showBadge={false}
            showChartTitle={false}
          />
        </motion.div>

        <motion.div
          {...getRevealProps(5)}
          className="order-4 flex flex-col gap-6 lg:order-5 lg:col-span-1"
        >
          <div className="qc-card">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-[15px] font-semibold text-[#111827]">
                CV Trend
              </h3>
              <div
                className={`flex items-center gap-1 text-[13px] font-semibold ${trendDirection === "down" ? "text-[#0f766e]" : "text-[#d97706]"}`}
              >
                <span>{`${Math.abs(chartTrendDelta).toFixed(1)}%`}</span>
                {trendDirection === "down" ? (
                  <TrendDownIcon size={14} />
                ) : (
                  <TrendUpIcon size={14} />
                )}
              </div>
            </div>

            <div className="mb-4 h-20 rounded-xl bg-[linear-gradient(180deg,rgba(13,148,136,0.04)_0%,rgba(13,148,136,0.01)_100%)] p-1">
              {cvTrend.sparklinePoints.length > 0 ? (
                <svg
                  viewBox="0 0 160 80"
                  className="h-full w-full"
                  role="img"
                  aria-label="CV trend sparkline"
                >
                  <path d={trendAreaPath} fill="rgba(13,148,136,0.10)" />
                  <path
                    d={trendPath}
                    fill="none"
                    stroke="#0d9488"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
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
                className={`h-full rounded-full ${currentCV > settings.cvAlertThreshold ? "bg-[#dc2626]" : "bg-[#0d9488]"}`}
                style={{
                  width: `${Math.min((currentCV / settings.cvAlertThreshold) * 100, 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="flex flex-col qc-card flex-1">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#111827]">
                Recent Flags
              </h3>
            </div>

            {recentFlags.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-4 text-center text-[13px] text-[#9ca3af]">
                No recent flags
              </div>
            ) : (
              <div className="flex flex-1 flex-col space-y-4">
                {recentFlags.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        item.icon === "warning"
                          ? item.severity === "rejection"
                            ? "bg-[#fee2e2] text-[#dc2626]"
                            : "bg-[#fef3c7] text-[#d97706]"
                          : "bg-[#f3f4f6] text-[#6b7280]"
                      }`}
                    >
                      {item.icon === "warning" ? (
                        <WarningIcon size={16} />
                      ) : (
                        <ClockIcon size={16} />
                      )}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[#111827]">
                        {item.label}
                      </p>
                      <p className="text-[12px] text-[#6b7280]">
                        {item.secondary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              className="mt-auto h-10 w-full border-[#dbe4ff] text-[#1a1aff]"
              onClick={() => navigate("/violations")}
            >
              View Rule Logs
            </Button>
          </div>
        </motion.div>

        <motion.div
          {...getRevealProps(4)}
          className="qc-card order-5 lg:order-4 lg:col-span-2"
        >
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[16px] font-semibold text-[#111827]">
            Recent Control Runs
          </h2>
          <p className="text-[13px] text-[#6b7280]">{`Showing last ${sortedRecentEntries.length} of ${entries.length} runs`}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-[#eef2f7] hover:bg-transparent">
              <TableHead className="h-12 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]">
                Date &amp; Time
              </TableHead>
              <TableHead className="h-12 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]">
                {isInHouseControl ? "Protocol No." : "Lot Number"}
              </TableHead>
              <TableHead className="h-12 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]">
                OD Reading
              </TableHead>
              <TableHead className="h-12 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]">
                SD Deviation
              </TableHead>
              <TableHead className="h-12 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]">
                Status
              </TableHead>
              <TableHead className="h-12 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]">
                Performed By
              </TableHead>
              <TableHead className="h-12 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]">
                Validated By
              </TableHead>
              <TableHead className="h-12 text-right text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRecentEntries.map((entry) => {
              const zScore =
                statistics.sampleCount >= 2 && statistics.sd > 0
                  ? calculateZScore(
                      entry.odValue,
                      statistics.mean,
                      statistics.sd,
                    )
                  : 0;
              const zScoreMeta = getZScoreTone(zScore);

              return (
                <TableRow
                  key={entry.id}
                  className="border-[#eef2f7] bg-white hover:bg-[#f8fafc]"
                >
                  <TableCell className="py-4 text-[14px] text-[#111827]">
                    {formatDateTimeLabel(getEntryTimestamp(entry))}
                  </TableCell>
                  <TableCell className="py-4 text-[14px] text-[#374151]">
                    <div className="flex items-center gap-2">
                      <span className={isInHouseControl ? "font-mono" : ""}>
                        {isInHouseControl
                          ? entry.protocolNumber
                          : entry.lotNumber}
                      </span>
                      {entry.signedBy && (
                        <LockIcon size={14} className="text-[#9ca3af]" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-[14px] font-medium text-[#111827]">
                    <div className="flex items-center gap-2">
                      <span>{entry.odValue.toFixed(4)}</span>
                      {entry.editedAt && (
                        <Badge className="bg-[#fef3c7] text-[#d97706]">
                          Edited
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${zScoreMeta.tint}`}
                    >
                      {`${zScore >= 0 ? "+" : ""}${zScore.toFixed(1)} SD`}
                    </span>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2 text-[14px] text-[#111827]">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${zScoreMeta.dot}`}
                      />
                      {zScoreMeta.status}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-[14px] text-[#374151]">
                    <StaffNameLabel
                      name={entry.performedBy}
                      memberId={entry.performedById}
                      staff={staff}
                    />
                  </TableCell>
                  <TableCell className="py-4 text-[14px] text-[#374151]">
                    <StaffNameLabel
                      name={entry.validatedBy}
                      memberId={entry.validatedById}
                      staff={staff}
                      emptyLabel="—"
                    />
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-[#94a3b8]"
                        >
                          <DotsThreeIcon size={16} />
                          <span className="sr-only">Open entry actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={() => setSelectedEntry(entry)}
                        >
                          View detail
                        </DropdownMenuItem>
                        {canEditEntries && (
                          <DropdownMenuItem
                            disabled={
                              isArchivedDataset || entry.signedBy !== null
                            }
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
          <button
            type="button"
            onClick={() => navigate("/history")}
            className="text-[14px] font-semibold text-[#1a1aff]"
          >
            View All Analysis History
          </button>
        </div>
        </motion.div>
      </div>

      <QCRulesReferenceCard
        className="mt-6"
        minRunsForWestgard={minRunsForWestgard}
      />

      <Dialog
        open={pendingImport !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingImport(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isImportBlocked
                ? "This workbook cannot fill the form"
                : "Check this before filling the form"}
            </DialogTitle>
            <DialogDescription>{pendingImport?.fileName}</DialogDescription>
          </DialogHeader>

          <ul className="space-y-2">
            {pendingImport?.issues.map((issue) => (
              <li
                key={issue.message}
                className={`rounded-lg border px-3 py-2.5 text-[13px] leading-5 ${
                  issue.severity === "block"
                    ? "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]"
                    : issue.severity === "confirm"
                      ? "border-[#fde68a] bg-[#fffbeb] text-[#b45309]"
                      : "border-[#e5e7eb] bg-[#f9fafb] text-[#4b5563]"
                }`}
              >
                {issue.message}
              </li>
            ))}
          </ul>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingImport(null)}
            >
              {isImportBlocked ? "Close" : "Cancel"}
            </Button>
            {!isImportBlocked && pendingImport !== null && (
              <Button
                type="button"
                className="bg-[#1a1aff] text-white hover:bg-[#1515cc]"
                onClick={() =>
                  applyParsedRun(pendingImport.run, pendingImport.fileName)
                }
              >
                Fill the form
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StaffFormDialog
        open={isStaffDialogOpen}
        onOpenChange={setIsStaffDialogOpen}
        member={null}
        onInvalid={error}
        onSubmit={handleQuickAddStaff}
      />

      <LotFormDialog
        open={isStartLotDialogOpen}
        onOpenChange={setIsStartLotDialogOpen}
        target={{ disease: diseaseSlug, controlType }}
        defaultStartDate={getTodayIsoDate()}
        dateFormat={settings.dateFormat}
        onInvalid={error}
        onSubmit={handleCreateLot}
      />

      <Dialog
        open={selectedEntry !== null}
        onOpenChange={(open) => !open && setSelectedEntry(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedEntry?.protocolNumber ?? "Entry detail"}
            </DialogTitle>
            <DialogDescription>
              Review the selected QC entry details.
            </DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.05em] text-[#6b7280]">
                  Date
                </p>
                <p className="mt-1 text-sm font-medium text-[#111827]">
                  {formatDateLabel(selectedEntry.date)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.05em] text-[#6b7280]">
                  OD Reading
                </p>
                <p className="mt-1 text-sm font-medium text-[#111827]">
                  {selectedEntry.odValue.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.05em] text-[#6b7280]">
                  Protocol No.
                </p>
                <p className="mt-1 text-sm font-medium text-[#111827]">
                  {selectedEntry.protocolNumber}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.05em] text-[#6b7280]">
                  Performed By
                </p>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  <StaffNameLabel
                    name={selectedEntry.performedBy}
                    memberId={selectedEntry.performedById}
                    staff={staff}
                  />
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.05em] text-[#6b7280]">
                  Validated By
                </p>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  <StaffNameLabel
                    name={selectedEntry.validatedBy}
                    memberId={selectedEntry.validatedById}
                    staff={staff}
                    emptyLabel="—"
                  />
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.05em] text-[#6b7280]">
                  {isInHouseControl ? "In-house Batch" : "Lot Number"}
                </p>
                <p className="mt-1 text-sm font-medium text-[#111827]">
                  {selectedEntry.lotNumber}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[11px] uppercase tracking-[0.05em] text-[#6b7280]">
                  Remarks
                </p>
                <p className="mt-1 text-sm font-medium text-[#111827]">
                  {selectedEntry.notes ?? "No remarks recorded."}
                </p>
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

      <ExportModal
        open={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        disease={exportDiseaseLabel}
        controlType={exportControlTypeLabel}
        controlLabel={exportControlLabel}
        year={exportYear}
        mean={runStatistics.mean}
        sd={runStatistics.sd}
        cv={runStatistics.cv}
        totalRuns={runStatistics.totalRuns}
        lotNumber={exportLotNumber}
        chartData={printableChartData}
      />

      {isLoading && (
        <div className="mt-4 text-sm text-[#6b7280]">Refreshing dataset...</div>
      )}
    </div>
  );
}
