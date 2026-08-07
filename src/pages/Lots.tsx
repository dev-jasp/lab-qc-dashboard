import { ArchiveIcon, PlusCircleIcon, StackIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { LotAttentionPanel } from '@/components/lots/LotAttentionPanel';
import { LotFormDialog, type LotTarget } from '@/components/lots/LotFormDialog';
import { LotTable } from '@/components/lots/LotTable';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { controlTypeToTabSlug, DISEASE_DEFINITIONS } from '@/constants/monitor-config';
import { useToast } from '@/hooks/useToast';
import { buildLotRegistry, type LotRecord, type LotRegistry } from '@/lib/lotRegistry';
import type { LotFormValues } from '@/lib/lotValidation';
import {
  archiveInHouseBatch,
  archiveLot,
  createInHouseBatch,
  createLot,
  getSettings,
} from '@/lib/qcStorage';
import type { DiseaseSlug } from '@/types/qc.types';
import { cn } from '@/utils/cn';

const PILL_CLASS_NAME =
  'h-9 rounded-full border border-[#dbe3ef] bg-white px-4 text-[13px] font-semibold text-[#374151] transition-colors hover:bg-[#f8fafc]';
const PILL_ACTIVE_CLASS_NAME = 'border-[#1a1aff] bg-[#eef2ff] text-[#1a1aff] hover:bg-[#eef2ff]';

const EMPTY_REGISTRY: LotRegistry = {
  records: [],
  active: [],
  archived: [],
  attention: [],
};

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function Lots() {
  const [registry, setRegistry] = useState<LotRegistry>(EMPTY_REGISTRY);
  const [warningDays, setWarningDays] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDisease, setSelectedDisease] = useState<DiseaseSlug | 'all'>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formTarget, setFormTarget] = useState<LotTarget | null>(null);
  const [pendingArchive, setPendingArchive] = useState<LotRecord | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const navigate = useNavigate();
  const { success, error } = useToast();

  useEffect(() => {
    let isCancelled = false;

    const loadRegistry = async () => {
      setIsLoading(true);
      try {
        const settings = await getSettings();
        const nextRegistry = await buildLotRegistry(settings.lotExpiryWarningDays);

        if (!isCancelled) {
          setWarningDays(settings.lotExpiryWarningDays);
          setRegistry(nextRegistry);
        }
      } catch (caughtError) {
        if (!isCancelled) {
          error(
            caughtError instanceof Error
              ? caughtError.message
              : 'Unable to load the lot registry.',
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadRegistry();

    return () => {
      isCancelled = true;
    };
  }, [error, reloadToken]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  const visibleActive = useMemo(
    () =>
      selectedDisease === 'all'
        ? registry.active
        : registry.active.filter((record) => record.disease === selectedDisease),
    [registry.active, selectedDisease],
  );

  const visibleArchived = useMemo(
    () =>
      selectedDisease === 'all'
        ? registry.archived
        : registry.archived.filter((record) => record.disease === selectedDisease),
    [registry.archived, selectedDisease],
  );

  const visibleAttention = useMemo(
    () =>
      selectedDisease === 'all'
        ? registry.attention
        : registry.attention.filter((item) =>
            item.kind === 'no-active-lot'
              ? item.missing.disease === selectedDisease
              : item.record.disease === selectedDisease,
          ),
    [registry.attention, selectedDisease],
  );

  const openForm = useCallback((target: LotTarget | null) => {
    setFormTarget(target);
    setIsFormOpen(true);
  }, []);

  const handleOpenMonitor = useCallback(
    (record: LotRecord) => {
      navigate(`/monitor/${record.disease}/${controlTypeToTabSlug(record.controlType)}`);
    },
    [navigate],
  );

  const handleCreate = useCallback(
    async (values: LotFormValues, target: LotTarget): Promise<boolean> => {
      const notes = values.notes ? values.notes : null;

      try {
        if (target.controlType === 'in-house-control') {
          await createInHouseBatch(target.disease, {
            batchId: values.lotNumber,
            startDate: values.startDate,
            endDate: null,
            status: 'active',
            notes,
          });
          success(`In-house batch ${values.lotNumber} is now active.`);
        } else {
          await createLot(target.disease, target.controlType, {
            lotNumber: values.lotNumber,
            startDate: values.startDate,
            endDate: null,
            expiryDate: values.expiryDate,
            status: 'active',
            notes,
          });
          success(`Lot ${values.lotNumber} is now active.`);
        }

        refresh();
        return true;
      } catch (caughtError) {
        error(
          caughtError instanceof Error ? caughtError.message : 'Unable to start the new lot.',
        );
        return false;
      }
    },
    [error, refresh, success],
  );

  const handleConfirmArchive = useCallback(async () => {
    if (pendingArchive === null) {
      return;
    }

    const record = pendingArchive;

    try {
      if (record.partitionKind === 'batch') {
        await archiveInHouseBatch(record.disease, record.partitionId);
      } else {
        await archiveLot(record.disease, record.controlType, record.partitionId);
      }

      success(`${record.partitionId} archived.`);
      refresh();
    } catch (caughtError) {
      error(caughtError instanceof Error ? caughtError.message : 'Unable to archive.');
    } finally {
      setPendingArchive(null);
    }
  }, [error, pendingArchive, refresh, success]);

  const attentionCount = registry.attention.length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
              Lot Management
            </p>
            <h1 className="mt-3 text-3xl font-bold text-[#111827]">
              Reagent lots &amp; in-house batches
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-[#6b7280]">
              Every control stream&apos;s working lot in one place — what is running now, when it
              expires, and how each changeover moved the baseline. Reagent lots expire; in-house
              batches are lab-made and do not.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold',
                attentionCount > 0
                  ? 'bg-[#fee2e2] text-[#dc2626]'
                  : 'bg-[#ccfbf1] text-[#0f766e]',
              )}
            >
              <StackIcon size={16} />
              {isLoading
                ? 'Loading lots...'
                : attentionCount > 0
                  ? `${attentionCount} need attention`
                  : 'All lots healthy'}
            </div>
            <Button
              type="button"
              onClick={() => openForm(null)}
              className="h-9 gap-1.5 rounded-full bg-[#1a1aff] text-[13px] font-semibold text-white hover:bg-[#1515cc]"
            >
              <PlusCircleIcon size={15} />
              Start new lot
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
          Disease
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedDisease('all')}
            className={cn(PILL_CLASS_NAME, selectedDisease === 'all' && PILL_ACTIVE_CLASS_NAME)}
          >
            All
            <span className="ml-1 text-[#9ca3af]">{registry.active.length}</span>
          </button>
          {DISEASE_DEFINITIONS.map((disease) => (
            <button
              key={disease.slug}
              type="button"
              onClick={() => setSelectedDisease(disease.slug)}
              className={cn(
                PILL_CLASS_NAME,
                selectedDisease === disease.slug && PILL_ACTIVE_CLASS_NAME,
              )}
            >
              {disease.name}
              <span className="ml-1 text-[#9ca3af]">
                {registry.active.filter((record) => record.disease === disease.slug).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-4 py-12 text-center text-sm text-[#6b7280]">
          Reading the lot registry...
        </div>
      )}

      {!isLoading && (
        <>
          <LotAttentionPanel items={visibleAttention} onStartLot={(target) => openForm(target)} />

          <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[16px] font-semibold text-[#111827]">Active lots</h2>
              <span className="text-[13px] text-[#6b7280]">
                {`Expiry warning at ${warningDays} days · set in Settings`}
              </span>
            </div>
            <LotTable
              records={visibleActive}
              variant="active"
              onOpenMonitor={handleOpenMonitor}
              onStartReplacement={(record) =>
                openForm({ disease: record.disease, controlType: record.controlType })
              }
              onArchive={setPendingArchive}
              emptyMessage="No active lots for this filter."
            />
          </div>

          {visibleArchived.length > 0 && (
            <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[16px] font-semibold text-[#111827]">
                  {`Archived (${visibleArchived.length})`}
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowArchived((current) => !current)}
                  className="h-9 gap-1.5 rounded-full text-[13px] font-semibold text-[#1a1aff] hover:bg-[#eef2ff]"
                >
                  <ArchiveIcon size={15} />
                  {showArchived ? 'Hide archived' : 'Show archived'}
                </Button>
              </div>
              {showArchived && (
                <div className="mt-5">
                  <LotTable
                    records={visibleArchived}
                    variant="archived"
                    onOpenMonitor={handleOpenMonitor}
                    onStartReplacement={(record) =>
                      openForm({ disease: record.disease, controlType: record.controlType })
                    }
                    onArchive={setPendingArchive}
                    emptyMessage="No archived lots for this filter."
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}

      <LotFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        target={formTarget}
        defaultStartDate={getTodayIsoDate()}
        onInvalid={error}
        onSubmit={handleCreate}
      />

      <AlertDialog
        open={pendingArchive !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingArchive(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingArchive?.partitionKind === 'batch' ? 'Archive batch?' : 'Archive lot?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingArchive === null
                ? ''
                : `${pendingArchive.partitionId} will become read-only for ${pendingArchive.diseaseName} · ${pendingArchive.controlShortLabel}. Its ${pendingArchive.runCount} recorded runs are kept and stay viewable, but no new runs can be added. This control will have no active lot until you start one.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Lots;
