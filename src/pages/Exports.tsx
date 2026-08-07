import { DownloadSimpleIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ExportDiseaseSection,
  type DataExportFormat,
} from '@/components/export/ExportDiseaseSection';
import { ExportFilterBar } from '@/components/export/ExportFilterBar';
import { ExportReportDialog } from '@/components/export/ExportReportDialog';
import type { PrintableQCLayoutProps } from '@/components/export/PrintableQCLayout';
import { useToast } from '@/hooks/useToast';
import {
  buildExportCatalog,
  buildStreamKey,
  countRuns,
  countStreams,
  filterCatalogByDateRange,
  selectActiveStreams,
  type DateRange,
  type DiseaseExportGroup,
  type ExportStream,
} from '@/lib/exportCatalog';
import { downloadDiseaseCsv, downloadStreamCsv } from '@/lib/exportCsv';
import { buildDiseaseReportFilename, buildStreamFilename } from '@/lib/exportFilenames';
import { toPrintableSection } from '@/lib/exportSections';
import { downloadDiseaseXlsx, downloadStreamXlsx } from '@/lib/exportXlsx';
import type { DiseaseSlug } from '@/types/qc.types';

type PdfRequest = {
  title: string;
  description: string;
  filename: string;
  sections: PrintableQCLayoutProps[];
};

const EMPTY_DATE_RANGE: DateRange = { from: null, to: null };

/** Describes the active date window for the whole-disease report filename. */
function describePeriod({ from, to }: DateRange): string {
  if (from !== null && to !== null) {
    return `${from}_to_${to}`;
  }
  if (from !== null) {
    return `from-${from}`;
  }
  if (to !== null) {
    return `to-${to}`;
  }

  return 'All-Runs';
}

export function Exports() {
  const [catalog, setCatalog] = useState<DiseaseExportGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDisease, setSelectedDisease] = useState<DiseaseSlug | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange>(EMPTY_DATE_RANGE);
  const [archivedDiseases, setArchivedDiseases] = useState<string[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [pdfRequest, setPdfRequest] = useState<PdfRequest | null>(null);
  const { success, error } = useToast();

  useEffect(() => {
    let isCancelled = false;

    const loadCatalog = async () => {
      setIsLoading(true);
      try {
        const groups = await buildExportCatalog();

        if (!isCancelled) {
          setCatalog(groups);
        }
      } catch (caughtError) {
        if (!isCancelled) {
          error(
            caughtError instanceof Error
              ? caughtError.message
              : 'Unable to load the export catalog.',
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadCatalog();

    return () => {
      isCancelled = true;
    };
  }, [error]);

  const filteredCatalog = useMemo(() => {
    const dateFiltered = filterCatalogByDateRange(catalog, dateRange);

    return selectedDisease === 'all'
      ? dateFiltered
      : dateFiltered.filter((group) => group.disease === selectedDisease);
  }, [catalog, dateRange, selectedDisease]);

  const diseaseOptions = useMemo(
    () =>
      catalog.map((group) => ({
        slug: group.disease,
        name: group.diseaseName,
        streamCount: selectActiveStreams(group.streams).length,
      })),
    [catalog],
  );

  const totalStreams = countStreams(catalog);
  const visibleStreams = countStreams(filteredCatalog);
  const visibleRuns = countRuns(filteredCatalog);

  const handleDownloadStream = useCallback(
    async (stream: ExportStream, exportFormat: DataExportFormat) => {
      const filename = buildStreamFilename(stream, exportFormat);

      try {
        if (exportFormat === 'csv') {
          downloadStreamCsv(stream, filename);
        } else {
          setBusyKey(buildStreamKey(stream));
          await downloadStreamXlsx(stream, filename);
        }
        success(`${filename} downloaded`);
      } catch (caughtError) {
        error(
          caughtError instanceof Error ? caughtError.message : 'Unable to generate the file.',
        );
      } finally {
        setBusyKey(null);
      }
    },
    [error, success],
  );

  const handleDownloadDisease = useCallback(
    async (group: DiseaseExportGroup, exportFormat: DataExportFormat) => {
      const streams = group.streams.filter((stream) => stream.runCount > 0);

      if (streams.length === 0) {
        error(`${group.diseaseName} has no runs in the selected date range.`);
        return;
      }

      const filename = buildDiseaseReportFilename(
        group.diseaseName,
        describePeriod(dateRange),
        exportFormat,
      );

      try {
        if (exportFormat === 'csv') {
          downloadDiseaseCsv(streams, filename);
        } else {
          setBusyKey(`${group.disease}:full`);
          await downloadDiseaseXlsx(streams, filename);
        }
        success(`${filename} downloaded`);
      } catch (caughtError) {
        error(
          caughtError instanceof Error ? caughtError.message : 'Unable to generate the file.',
        );
      } finally {
        setBusyKey(null);
      }
    },
    [dateRange, error, success],
  );

  const handlePreviewStreamPdf = useCallback((stream: ExportStream) => {
    setPdfRequest({
      title: `${stream.diseaseName} · ${stream.controlLabel}`,
      description: `Lot ${stream.partitionId} · ${stream.runCount} runs. Review the ZCMC report before downloading.`,
      filename: buildStreamFilename(stream, 'pdf'),
      sections: [toPrintableSection(stream)],
    });
  }, []);

  const handlePreviewDiseasePdf = useCallback(
    (group: DiseaseExportGroup) => {
      const streams = group.streams.filter((stream) => stream.runCount > 0);

      if (streams.length === 0) {
        error(`${group.diseaseName} has no runs in the selected date range.`);
        return;
      }

      setPdfRequest({
        title: `${group.diseaseName} · full QC report`,
        description: `${streams.length} control streams · ${group.totalRuns} runs. One letterheaded page per stream.`,
        filename: buildDiseaseReportFilename(group.diseaseName, describePeriod(dateRange), 'pdf'),
        sections: streams.map(toPrintableSection),
      });
    },
    [dateRange, error],
  );

  const toggleArchived = useCallback((disease: string) => {
    setArchivedDiseases((current) =>
      current.includes(disease)
        ? current.filter((item) => item !== disease)
        : [...current, disease],
    );
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
              Exports
            </p>
            <h1 className="mt-3 text-3xl font-bold text-[#111827]">Download QC reports</h1>
            <p className="mt-3 max-w-3xl text-sm text-[#6b7280]">
              Every disease control stream is collected here as a downloadable ZCMC record. Pull a
              single lot as CSV, Excel or PDF, or generate a full report covering all three controls
              of a disease.
            </p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#eef2ff] px-4 py-2 text-sm font-semibold text-[#1a1aff]">
            <DownloadSimpleIcon size={16} />
            {isLoading
              ? 'Loading catalog...'
              : `${visibleStreams} streams · ${visibleRuns} runs`}
          </div>
        </div>
      </div>

      <ExportFilterBar
        diseases={diseaseOptions}
        selectedDisease={selectedDisease}
        onSelectDisease={setSelectedDisease}
        dateRange={dateRange}
        onChangeDateRange={setDateRange}
        totalStreams={totalStreams}
      />

      {isLoading && (
        <div className="rounded-2xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-4 py-12 text-center text-sm text-[#6b7280]">
          Building the export catalog...
        </div>
      )}

      {!isLoading && filteredCatalog.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-4 py-12 text-center">
          <p className="text-sm font-semibold text-[#111827]">No reports match this filter</p>
          <p className="mt-2 text-sm text-[#6b7280]">
            Try clearing the date range or selecting a different disease.
          </p>
        </div>
      )}

      {!isLoading && filteredCatalog.length > 0 && (
        <div className="space-y-6">
          {filteredCatalog.map((group) => (
            <ExportDiseaseSection
              key={group.disease}
              group={group}
              showArchived={archivedDiseases.includes(group.disease)}
              onToggleArchived={() => toggleArchived(group.disease)}
              onDownloadStream={handleDownloadStream}
              onPreviewStreamPdf={handlePreviewStreamPdf}
              onDownloadDisease={handleDownloadDisease}
              onPreviewDiseasePdf={handlePreviewDiseasePdf}
              busyKey={busyKey}
            />
          ))}
        </div>
      )}

      {pdfRequest !== null && (
        <ExportReportDialog
          open
          onClose={() => setPdfRequest(null)}
          title={pdfRequest.title}
          description={pdfRequest.description}
          filename={pdfRequest.filename}
          sections={pdfRequest.sections}
        />
      )}
    </div>
  );
}

export default Exports;
