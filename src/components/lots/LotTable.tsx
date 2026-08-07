import {
  ArchiveIcon,
  ArrowRightIcon,
  DotsThreeIcon,
  PlusCircleIcon,
  TrendDownIcon,
  TrendUpIcon,
} from '@phosphor-icons/react';
import { format, parseISO } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ExpiryState, LotRecord, LotShift } from '@/lib/lotRegistry';

const HEAD_CLASS_NAME =
  'h-12 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]';
const CELL_CLASS_NAME = 'py-4 text-[14px] text-[#374151]';

export type LotTableVariant = 'active' | 'archived';

interface LotTableProps {
  records: LotRecord[];
  variant: LotTableVariant;
  onOpenMonitor: (record: LotRecord) => void;
  onStartReplacement: (record: LotRecord) => void;
  onArchive: (record: LotRecord) => void;
  emptyMessage: string;
}

function buildLotKey(record: LotRecord): string {
  return `${record.disease}:${record.controlType}:${record.partitionId}`;
}

function formatDateLabel(value: string | null): string {
  if (value === null || value === '') {
    return '—';
  }

  try {
    return format(parseISO(value), 'MMM dd, yyyy');
  } catch {
    return value;
  }
}

function ExpiryCell({ expiry, expiryDate }: { expiry: ExpiryState; expiryDate: string | null }) {
  if (expiry.kind === 'none') {
    return <span className="text-[#9ca3af]">—</span>;
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      {formatDateLabel(expiryDate)}
      {expiry.kind === 'expired' && (
        <Badge className="bg-[#fee2e2] text-[#dc2626]">
          {expiry.daysOverdue === 0 ? 'Expires today' : `${expiry.daysOverdue}d overdue`}
        </Badge>
      )}
      {expiry.kind === 'warning' && (
        <Badge className="bg-[#fef3c7] text-[#d97706]">
          {expiry.daysRemaining === 0 ? 'Expires today' : `${expiry.daysRemaining}d left`}
        </Badge>
      )}
    </span>
  );
}

const SHIFT_TONE_CLASS_NAME: Record<LotShift['tone'], string> = {
  neutral: 'text-[#6b7280]',
  warning: 'text-[#d97706]',
  critical: 'text-[#dc2626]',
};

function ShiftCell({ shift }: { shift: LotShift | null }) {
  if (shift === null) {
    return <span className="text-[#9ca3af]">—</span>;
  }

  const isUp = shift.meanDeltaPercent >= 0;
  const ShiftIcon = isUp ? TrendUpIcon : TrendDownIcon;

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold ${SHIFT_TONE_CLASS_NAME[shift.tone]}`}
      title={`Mean ${isUp ? 'up' : 'down'} ${Math.abs(shift.meanDeltaPercent).toFixed(2)}% and CV ${
        shift.cvDelta >= 0 ? 'up' : 'down'
      } ${Math.abs(shift.cvDelta).toFixed(2)} points vs ${shift.previousId}`}
    >
      <ShiftIcon size={14} />
      {`${Math.abs(shift.meanDeltaPercent).toFixed(1)}%`}
    </span>
  );
}

export function LotTable({
  records,
  variant,
  onOpenMonitor,
  onStartReplacement,
  onArchive,
  emptyMessage,
}: LotTableProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-4 py-8 text-center text-sm text-[#6b7280]">
        {emptyMessage}
      </div>
    );
  }

  const isActive = variant === 'active';

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-[#eef2f7] hover:bg-transparent">
          <TableHead className={HEAD_CLASS_NAME}>Disease</TableHead>
          <TableHead className={HEAD_CLASS_NAME}>Control</TableHead>
          <TableHead className={HEAD_CLASS_NAME}>Lot / Batch</TableHead>
          <TableHead className={HEAD_CLASS_NAME}>Started</TableHead>
          <TableHead className={HEAD_CLASS_NAME}>{isActive ? 'Expires' : 'Ended'}</TableHead>
          <TableHead className={HEAD_CLASS_NAME}>Runs</TableHead>
          <TableHead className={HEAD_CLASS_NAME}>CV%</TableHead>
          <TableHead className={HEAD_CLASS_NAME}>Shift</TableHead>
          <TableHead className={`${HEAD_CLASS_NAME} text-right`}>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow
            key={buildLotKey(record)}
            className="border-[#eef2f7] bg-white hover:bg-[#f8fafc]"
          >
            <TableCell className="py-4 text-[14px] font-medium text-[#111827]">
              {record.diseaseName}
            </TableCell>
            <TableCell className={CELL_CLASS_NAME}>{record.controlShortLabel}</TableCell>
            <TableCell className={CELL_CLASS_NAME}>
              <span className="flex flex-wrap items-center gap-2">
                {record.partitionId}
                {record.partitionKind === 'batch' && (
                  <Badge variant="outline" className="border-[#dbe3ef] bg-white text-[#6b7280]">
                    Batch
                  </Badge>
                )}
              </span>
            </TableCell>
            <TableCell className={CELL_CLASS_NAME}>{formatDateLabel(record.startDate)}</TableCell>
            <TableCell className={CELL_CLASS_NAME}>
              {isActive ? (
                <ExpiryCell expiry={record.expiry} expiryDate={record.expiryDate} />
              ) : (
                formatDateLabel(record.endDate)
              )}
            </TableCell>
            <TableCell className={CELL_CLASS_NAME}>{record.runCount}</TableCell>
            <TableCell className={CELL_CLASS_NAME}>
              {record.runCount < 2 ? '—' : `${record.cv.toFixed(2)}%`}
            </TableCell>
            <TableCell className={CELL_CLASS_NAME}>
              <ShiftCell shift={record.shift} />
            </TableCell>
            <TableCell className="py-4 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="text-[#94a3b8]">
                    <DotsThreeIcon size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onSelect={() => onOpenMonitor(record)}>
                    <ArrowRightIcon size={15} />
                    Open monitor
                  </DropdownMenuItem>
                  {isActive && (
                    <>
                      <DropdownMenuItem onSelect={() => onStartReplacement(record)}>
                        <PlusCircleIcon size={15} />
                        {record.partitionKind === 'batch'
                          ? 'Start replacement batch'
                          : 'Start replacement lot'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => onArchive(record)}>
                        <ArchiveIcon size={15} />
                        {record.partitionKind === 'batch' ? 'Archive batch' : 'Archive lot'}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
