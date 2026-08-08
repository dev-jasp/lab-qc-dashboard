import {
  ArchiveIcon,
  CaretDownIcon,
  FilePdfIcon,
  FileXlsIcon,
  FileCsvIcon,
  SpinnerIcon,
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
import type { DiseaseExportGroup, ExportStream } from '@/lib/exportCatalog';
import { buildStreamKey, selectActiveStreams } from '@/lib/exportCatalog';
import { cn } from '@/utils/cn';

export type DataExportFormat = 'csv' | 'xlsx';

interface ExportDiseaseSectionProps {
  group: DiseaseExportGroup;
  showArchived: boolean;
  onToggleArchived: () => void;
  onDownloadStream: (stream: ExportStream, exportFormat: DataExportFormat) => void;
  onPreviewStreamPdf: (stream: ExportStream) => void;
  onDownloadDisease: (group: DiseaseExportGroup, exportFormat: DataExportFormat) => void;
  onPreviewDiseasePdf: (group: DiseaseExportGroup) => void;
  busyKey: string | null;
}

const HEAD_CLASS_NAME =
  'h-12 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]';
const ROW_ACTION_CLASS_NAME = 'h-8 gap-1 rounded-full px-3 text-[12px] font-semibold';

type ReportFormat = 'csv' | 'xlsx' | 'pdf';

/**
 * Per-format colour, so a row's three actions are told apart at a glance.
 *
 * hover:text-* is repeated deliberately: the outline button variant sets
 * hover:text-foreground, and only an explicit hover utility gets it dropped by
 * tailwind-merge — without it the colour washes out under the cursor.
 */
const FORMAT_ACTION_CLASS_NAME: Record<ReportFormat, string> = {
  csv: 'border-[#dbe4ff] text-[#1a1aff] hover:bg-[#eef2ff] hover:text-[#1a1aff]',
  xlsx: 'border-[#bbf7d0] text-[#16a34a] hover:bg-[#f0fdf4] hover:text-[#16a34a]',
  pdf: 'border-[#fecaca] text-[#dc2626] hover:bg-[#fef2f2] hover:text-[#dc2626]',
};

/**
 * Same palette for the Full report menu. Applied inline rather than by class
 * because DropdownMenuItem repaints itself and every descendant on focus
 * (`focus:**:text-accent-foreground`), which a utility class cannot outrank.
 */
const FORMAT_COLOR: Record<ReportFormat, string> = {
  csv: '#1a1aff',
  xlsx: '#16a34a',
  pdf: '#dc2626',
};

function formatDateLabel(value: string | null): string {
  if (value === null) {
    return '—';
  }

  try {
    return format(parseISO(value), 'MMM dd, yyyy');
  } catch {
    return value;
  }
}

export function ExportDiseaseSection({
  group,
  showArchived,
  onToggleArchived,
  onDownloadStream,
  onPreviewStreamPdf,
  onDownloadDisease,
  onPreviewDiseasePdf,
  busyKey,
}: ExportDiseaseSectionProps) {
  const activeStreams = selectActiveStreams(group.streams);
  const archivedCount = group.streams.length - activeStreams.length;
  const visibleStreams = showArchived ? group.streams : activeStreams;
  const hasRuns = group.totalRuns > 0;
  const diseaseKey = `${group.disease}:full`;

  return (
    <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-[16px] font-semibold text-[#111827]">{group.diseaseName}</h2>
          <Badge variant="outline" className="border-[#dbe3ef] bg-white text-[#6b7280]">
            {group.assayTag}
          </Badge>
          <span className="text-[13px] text-[#6b7280]">
            {`${group.totalRuns} runs · ${activeStreams.length} active streams`}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={!hasRuns || busyKey === diseaseKey}
              className="h-9 shrink-0 gap-1.5 rounded-full border-[#dbe4ff] text-[13px] font-semibold text-[#1a1aff]"
            >
              {busyKey === diseaseKey ? (
                <SpinnerIcon size={15} className="animate-spin" />
              ) : (
                <CaretDownIcon size={13} />
              )}
              Full report
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onSelect={() => onPreviewDiseasePdf(group)}
              style={{ color: FORMAT_COLOR.pdf }}
            >
              <FilePdfIcon size={15} style={{ color: FORMAT_COLOR.pdf }} />
              PDF · all controls
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onDownloadDisease(group, 'xlsx')}
              style={{ color: FORMAT_COLOR.xlsx }}
            >
              <FileXlsIcon size={15} style={{ color: FORMAT_COLOR.xlsx }} />
              Excel · sheet per control
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onDownloadDisease(group, 'csv')}
              style={{ color: FORMAT_COLOR.csv }}
            >
              <FileCsvIcon size={15} style={{ color: FORMAT_COLOR.csv }} />
              CSV · all controls
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {visibleStreams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-4 py-8 text-center text-sm text-[#6b7280]">
          No control streams available for this disease.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-[#eef2f7] hover:bg-transparent">
              <TableHead className={HEAD_CLASS_NAME}>Control</TableHead>
              <TableHead className={HEAD_CLASS_NAME}>Lot / Batch</TableHead>
              <TableHead className={HEAD_CLASS_NAME}>Runs</TableHead>
              <TableHead className={HEAD_CLASS_NAME}>Last run</TableHead>
              <TableHead className={HEAD_CLASS_NAME}>Mean</TableHead>
              <TableHead className={HEAD_CLASS_NAME}>CV%</TableHead>
              <TableHead className={`${HEAD_CLASS_NAME} text-right`}>Download</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleStreams.map((stream) => {
              const streamKey = buildStreamKey(stream);
              const isEmpty = stream.runCount === 0;
              const isBusy = busyKey === streamKey;

              return (
                <TableRow key={streamKey} className="border-[#eef2f7] bg-white hover:bg-[#f8fafc]">
                  <TableCell className="py-4 text-[14px] font-medium text-[#111827]">
                    {stream.controlShortLabel}
                  </TableCell>
                  <TableCell className="py-4 text-[14px] text-[#374151]">
                    <span className="flex flex-wrap items-center gap-2">
                      {stream.partitionId}
                      {stream.partitionStatus === 'archived' && (
                        <Badge className="bg-[#f3f4f6] text-[#6b7280]">Archived</Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 text-[14px] text-[#374151]">
                    {stream.runCount}
                  </TableCell>
                  <TableCell className="py-4 text-[14px] text-[#374151]">
                    {formatDateLabel(stream.lastRunDate)}
                  </TableCell>
                  <TableCell className="py-4 text-[14px] text-[#374151]">
                    {isEmpty ? '—' : stream.statistics.mean.toFixed(3)}
                  </TableCell>
                  <TableCell className="py-4 text-[14px] text-[#374151]">
                    {isEmpty ? '—' : `${stream.cv.toFixed(2)}%`}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isEmpty || isBusy}
                        onClick={() => onDownloadStream(stream, 'csv')}
                        className={cn(ROW_ACTION_CLASS_NAME, FORMAT_ACTION_CLASS_NAME.csv)}
                      >
                        <FileCsvIcon size={14} />
                        CSV
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isEmpty || isBusy}
                        onClick={() => onDownloadStream(stream, 'xlsx')}
                        className={cn(ROW_ACTION_CLASS_NAME, FORMAT_ACTION_CLASS_NAME.xlsx)}
                      >
                        {isBusy ? (
                          <SpinnerIcon size={14} className="animate-spin" />
                        ) : (
                          <FileXlsIcon size={14} />
                        )}
                        XLSX
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isEmpty || isBusy}
                        onClick={() => onPreviewStreamPdf(stream)}
                        className={cn(ROW_ACTION_CLASS_NAME, FORMAT_ACTION_CLASS_NAME.pdf)}
                      >
                        <FilePdfIcon size={14} />
                        PDF
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {archivedCount > 0 && (
        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            onClick={onToggleArchived}
            className="h-9 gap-1.5 rounded-full text-[13px] font-semibold text-[#1a1aff] hover:bg-[#eef2ff]"
          >
            <ArchiveIcon size={15} />
            {showArchived
              ? 'Hide archived lots'
              : `Show ${archivedCount} archived ${archivedCount === 1 ? 'lot' : 'lots'}`}
          </Button>
        </div>
      )}
    </div>
  );
}
