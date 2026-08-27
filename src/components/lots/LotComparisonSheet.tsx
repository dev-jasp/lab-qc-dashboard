import { useMemo } from 'react';

import { LotComparisonChart, type LotComparisonPoint } from '@/components/chart/LotComparisonChart';
import { Badge } from '@/components/ui/badge';
import { SHIFT_VERDICT } from '@/constants/lot-shift';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { LotRecord } from '@/lib/lotRegistry';

interface LotComparisonSheetProps {
  /** The lot whose control stream should be compared. Null closes the panel. */
  record: LotRecord | null;
  records: LotRecord[];
  onOpenChange: (open: boolean) => void;
}

function formatSigned(value: number, digits: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
}

export function LotComparisonSheet({ record, records, onOpenChange }: LotComparisonSheetProps) {
  // Every lot on the same control stream, newest first to match the lot tables.
  const streamLots = useMemo(() => {
    if (record === null) {
      return [];
    }

    return records
      .filter(
        (candidate) =>
          candidate.disease === record.disease && candidate.controlType === record.controlType,
      )
      .sort((first, second) => second.startDate.localeCompare(first.startDate));
  }, [record, records]);

  const points = useMemo<LotComparisonPoint[]>(
    () =>
      streamLots.map((lot) => ({
        id: lot.partitionId,
        mean: lot.statistics.mean,
        sd: lot.statistics.sd,
        cv: lot.cv,
        runCount: lot.runCount,
        status: lot.partitionStatus,
        startDate: lot.startDate,
      })),
    [streamLots],
  );

  const isSingleLot = streamLots.length < 2;

  return (
    <Sheet open={record !== null} onOpenChange={onOpenChange}>
      {/* The width override has to use the same variant stack the base class
          does (`data-[side=right]:sm:max-w-sm`), or both survive the merge and
          the panel stays at the narrow default. */}
      <SheetContent side="right" className="data-[side=right]:sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>
            {record === null
              ? 'Compare lots'
              : `${record.diseaseName} — ${record.controlLabel}`}
          </SheetTitle>
          <SheetDescription>
            {record?.partitionKind === 'batch'
              ? 'Each batch on this control, on one shared OD axis.'
              : 'Each reagent lot on this control, on one shared OD axis.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6">
          {isSingleLot ? (
            <div className="rounded-xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-4 py-10 text-center text-sm text-[#6b7280]">
              This control has only one lot on record, so there is nothing to compare
              against yet. A comparison appears once it is replaced.
            </div>
          ) : (
            <LotComparisonChart
              points={points}
              partitionNoun={record?.partitionKind === 'batch' ? 'batch' : 'lot'}
              height={Math.max(200, streamLots.length * 62)}
            />
          )}

          <div>
            <h3 className="mb-3 text-[13px] font-semibold text-[#111827]">Lot statistics</h3>
            <Table>
              <TableHeader>
                <TableRow className="border-[#eef2f7] hover:bg-transparent">
                  <TableHead className="h-10 text-[11px] uppercase tracking-[0.05em] text-[#94a3b8]">
                    Lot
                  </TableHead>
                  <TableHead className="h-10 text-[11px] uppercase tracking-[0.05em] text-[#94a3b8]">
                    Runs
                  </TableHead>
                  <TableHead className="h-10 text-[11px] uppercase tracking-[0.05em] text-[#94a3b8]">
                    Mean
                  </TableHead>
                  <TableHead className="h-10 text-[11px] uppercase tracking-[0.05em] text-[#94a3b8]">
                    SD
                  </TableHead>
                  <TableHead className="h-10 text-[11px] uppercase tracking-[0.05em] text-[#94a3b8]">
                    CV
                  </TableHead>
                  <TableHead className="h-10 text-[11px] uppercase tracking-[0.05em] text-[#94a3b8]">
                    Δ mean
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {streamLots.map((lot) => {
                  const verdict = lot.shift === null ? null : SHIFT_VERDICT[lot.shift.tone];

                  return (
                    <TableRow key={lot.partitionId} className="border-[#eef2f7] bg-white">
                      <TableCell className="py-3 text-[13px] text-[#111827]">
                        <span className="flex flex-wrap items-center gap-2">
                          {lot.partitionId}
                          {lot.partitionStatus === 'active' && (
                            <Badge className="bg-[#eef2ff] text-[#1a1aff]">In service</Badge>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[#9ca3af]">
                          {`from ${lot.startDate}`}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-[13px] text-[#374151]">
                        {lot.runCount}
                      </TableCell>
                      <TableCell className="py-3 text-[13px] tabular-nums text-[#374151]">
                        {lot.runCount < 1 ? '—' : lot.statistics.mean.toFixed(4)}
                      </TableCell>
                      <TableCell className="py-3 text-[13px] tabular-nums text-[#374151]">
                        {lot.runCount < 2 ? '—' : lot.statistics.sd.toFixed(4)}
                      </TableCell>
                      <TableCell className="py-3 text-[13px] tabular-nums text-[#374151]">
                        {lot.runCount < 2 ? '—' : `${lot.cv.toFixed(2)}%`}
                      </TableCell>
                      <TableCell className="py-3 text-[13px]">
                        {lot.shift === null || verdict === null ? (
                          <span className="text-[#9ca3af]">—</span>
                        ) : (
                          <span className="flex flex-col gap-1">
                            <span className="tabular-nums text-[#111827]">
                              {`${formatSigned(lot.shift.meanDeltaSD, 2)} SD`}
                            </span>
                            <Badge className={verdict.className}>{verdict.label}</Badge>
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <p className="mt-3 text-[12px] leading-5 text-[#6b7280]">
              Δ mean is the shift from the lot below it, measured in that lot&apos;s own
              standard deviations. A percentage alone cannot say whether a shift matters,
              because it does not know how tightly the previous lot was running.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
