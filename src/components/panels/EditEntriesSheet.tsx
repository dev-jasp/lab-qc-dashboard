import { useEffect, useMemo, useState } from 'react';
import { FlagIcon, LockIcon, PencilIcon } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { QCEntry } from '@/types/qc.types';
import { calculateZScore } from '@/utils/qc-calculations';

interface EditEntriesSheetProps {
  entries: QCEntry[];
  mean: number;
  sd: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (entry: QCEntry, odValue: number, reason: string) => Promise<void>;
}

function getZScoreTone(zScore: number): string {
  const absoluteZScore = Math.abs(zScore);

  if (absoluteZScore > 3) {
    return '#DC2626';
  }

  if (absoluteZScore > 2) {
    return '#D97706';
  }

  return '#16A34A';
}

export function EditEntriesSheet({
  entries,
  mean,
  sd,
  open,
  onOpenChange,
  onSave,
}: EditEntriesSheetProps) {
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [draftODValue, setDraftODValue] = useState('');
  const [editReason, setEditReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const expandedEntry = useMemo(
    () => entries.find((entry) => entry.id === expandedEntryId) ?? null,
    [entries, expandedEntryId],
  );
  const visibleEntries = useMemo(
    () =>
      [...entries].sort((left, right) => {
        const dateComparison = right.date.localeCompare(left.date);

        if (dateComparison !== 0) {
          return dateComparison;
        }

        return right.protocolNumber.localeCompare(left.protocolNumber);
      }),
    [entries],
  );
  const draftODNumber = Number.parseFloat(draftODValue);
  const liveZScore = Number.isFinite(draftODNumber) ? calculateZScore(draftODNumber, mean, sd) : null;

  useEffect(() => {
    if (!open) {
      setExpandedEntryId(null);
      setDraftODValue('');
      setEditReason('');
      setInlineError(null);
      setIsSaving(false);
    }
  }, [open]);

  const startEditing = (entry: QCEntry) => {
    setExpandedEntryId(entry.id);
    setDraftODValue(entry.odValue.toFixed(4));
    setEditReason('');
    setInlineError(null);
  };

  const cancelEditing = () => {
    setExpandedEntryId(null);
    setDraftODValue('');
    setEditReason('');
    setInlineError(null);
  };

  const handleSave = async () => {
    if (!expandedEntry) {
      return;
    }

    if (!Number.isFinite(draftODNumber) || draftODNumber < 0 || draftODNumber > 10) {
      setInlineError('OD value must be a valid number between 0 and 10.');
      return;
    }

    if (!editReason.trim()) {
      setInlineError('Edit reason is required.');
      return;
    }

    setIsSaving(true);
    setInlineError(null);

    try {
      await onSave(expandedEntry, draftODNumber, editReason.trim());
      setEditReason('');
      setExpandedEntryId(null);
      setDraftODValue('');
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : 'Unable to save this QC entry change.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        className="w-[420px] sm:max-w-[420px]"
        overlayClassName="pointer-events-none bg-transparent backdrop-blur-0"
      >
        <SheetHeader className="border-b border-[#E5EAF2]">
          <SheetTitle>Edit QC Entries</SheetTitle>
          <SheetDescription>All changes are logged in the audit trail</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {entries.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-[#D9E2F1] bg-[#F9FBFF] px-4 py-6 text-sm text-[#64748B]">
              No entries are available for editing in this dataset.
            </div>
          ) : (
            <div className="space-y-3 pt-4">
              {visibleEntries.map((entry) => {
                const isSigned = entry.signedBy !== null;
                const isExpanded = entry.id === expandedEntryId;

                return (
                  <div
                    key={entry.id}
                    className="group rounded-xl border border-[#E5EAF2] bg-white p-4 shadow-sm"
                    title={isSigned ? 'Signed - cannot edit' : undefined}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#1A1C1C]">{entry.protocolNumber}</p>
                          {entry.flag && (
                            <Badge className="bg-[#EFF6FF] text-[#2563EB]">
                              <FlagIcon size={12} />
                              {entry.flag.replaceAll('_', ' ')}
                            </Badge>
                          )}
                          {entry.editedAt && (
                            <Badge className="bg-[#FEF3C7] text-[#D97706]">Edited</Badge>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-[#64748B]">
                          {entry.date} | {entry.odValue.toFixed(4)}
                        </p>
                      </div>

                      {isSigned ? (
                        <div className="flex items-center text-[#64748B]" title="Signed - cannot edit">
                          <LockIcon size={16} />
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className={`shrink-0 text-[#0000FF] transition-opacity ${isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                          onClick={() => startEditing(entry)}
                        >
                          <PencilIcon size={16} />
                          <span className="sr-only">Edit entry {entry.protocolNumber}</span>
                        </Button>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="mt-4 rounded-lg border border-[#E5EAF2] bg-[#F9FBFF] p-4">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-[#1A1C1C]">OD Value</label>
                            <input
                              type="number"
                              step="0.0001"
                              min="0"
                              max="10"
                              value={draftODValue}
                              onChange={(event) => setDraftODValue(event.target.value)}
                              className="w-full rounded-lg border border-[#DCE4F2] px-3 py-2 text-sm outline-none transition focus:border-[#0000FF]"
                            />
                            <p
                              className="text-xs font-semibold"
                              style={{ color: liveZScore === null ? '#64748B' : getZScoreTone(liveZScore) }}
                            >
                              {liveZScore === null ? 'Z-score updates after a valid OD value is entered.' : `z = ${liveZScore.toFixed(2)}`}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-[#1A1C1C]">Edit reason</label>
                            <input
                              type="text"
                              value={editReason}
                              maxLength={200}
                              onChange={(event) => setEditReason(event.target.value)}
                              placeholder="e.g. Transcription error - wrong value recorded"
                              className="w-full rounded-lg border border-[#DCE4F2] px-3 py-2 text-sm outline-none transition focus:border-[#0000FF]"
                            />
                          </div>

                          {inlineError && (
                            <p className="text-sm font-medium text-[#DC2626]">{inlineError}</p>
                          )}

                          <div className="flex items-center gap-2">
                            <Button type="button" size="sm" onClick={() => void handleSave()} disabled={isSaving}>
                              Save change
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={cancelEditing} disabled={isSaving}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
