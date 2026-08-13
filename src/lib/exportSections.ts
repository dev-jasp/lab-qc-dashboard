import type { PrintableQCLayoutProps } from '@/components/export/PrintableQCLayout';
import type { ExportStream } from '@/lib/exportCatalog';
import { getReportYear } from '@/lib/reportPeriod';

/**
 * Maps a catalog stream onto the print layout's props, mirroring the label
 * derivation QCDashboard uses so a report generated here is identical to one
 * generated from the monitor page.
 */
export function toPrintableSection(stream: ExportStream): PrintableQCLayoutProps {
  return {
    disease: stream.diseaseName.toUpperCase(),
    controlType: stream.controlLabel.toUpperCase(),
    controlLabel: stream.controlCode,
    year: getReportYear(stream.entries.map((entry) => entry.date)),
    mean: stream.statistics.mean,
    sd: stream.statistics.sd,
    cv: stream.cv,
    totalRuns: stream.runCount,
    lotNumber: stream.partitionId,
    chartData: stream.entries.map((entry, index) => ({
      date: entry.date,
      odValue: entry.odValue,
      protocolNumber: entry.protocolNumber,
      runIndex: index + 1,
    })),
  };
}
