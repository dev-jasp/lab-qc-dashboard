import { FilePdfIcon, PrinterIcon, SpinnerIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/useToast';
import { captureLayout, downloadAsPDF } from '@/lib/exportQCChart';
import type { PrintableChartDataPoint } from '@/types/export';

import { PrintableQCLayout } from './PrintableQCLayout';

const PRINT_ROOT_ID = 'qc-print-root';

function waitForImageReady(image: HTMLImageElement): Promise<void> {
  if (image.complete && image.naturalWidth > 0) {
    return Promise.resolve();
  }

  const waitForLoad = () =>
    new Promise<void>((resolve, reject) => {
      const clearHandlers = () => {
        image.onload = null;
        image.onerror = null;
      };

      image.onload = () => {
        clearHandlers();
        resolve();
      };
      image.onerror = () => {
        clearHandlers();
        reject(new Error('Unable to load the chart image for printing.'));
      };

      if (image.complete) {
        clearHandlers();

        if (image.naturalWidth > 0) {
          resolve();
          return;
        }

        reject(new Error('Unable to load the chart image for printing.'));
      }
    });

  if (typeof image.decode === 'function') {
    return image.decode().catch(() => waitForLoad());
  }

  return waitForLoad();
}

export interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  disease: string;
  controlType: string;
  controlLabel: string;
  year: number;
  lotNumber?: string;
  mean: number;
  sd: number;
  cv: number;
  totalRuns: number;
  chartData: PrintableChartDataPoint[];
}

export function ExportModal({
  open,
  onClose,
  disease,
  controlType,
  controlLabel,
  year,
  lotNumber,
  mean,
  sd,
  cv,
  totalRuns,
  chartData,
}: ExportModalProps) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    if (!open) {
      setCapturedImageUrl(null);
      return;
    }

    let isCancelled = false;
    setCapturedImageUrl(null);
    setIsCapturing(true);

    const timer = window.setTimeout(async () => {
      if (!layoutRef.current) {
        if (!isCancelled) {
          setIsCapturing(false);
        }
        return;
      }

      try {
        const url = await captureLayout(layoutRef.current);
        if (!isCancelled) {
          setCapturedImageUrl(url);
        }
      } catch (caughtError) {
        if (!isCancelled) {
          error(
            caughtError instanceof Error
              ? caughtError.message
              : 'Unable to prepare chart preview.',
          );
        }
      } finally {
        if (!isCancelled) {
          setIsCapturing(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, chartData, mean, sd, cv, totalRuns, disease, controlLabel, year, lotNumber, error]);

  const handleDownload = useCallback(async () => {
    if (!capturedImageUrl) {
      return;
    }

    setIsDownloading(true);
    try {
      await downloadAsPDF(capturedImageUrl, { disease, controlLabel, year });
      success('PDF downloaded successfully');
    } catch (caughtError) {
      error(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to generate the PDF file.',
      );
    } finally {
      setIsDownloading(false);
    }
  }, [capturedImageUrl, controlLabel, disease, error, success, year]);

  const handlePrint = useCallback(async () => {
    if (!capturedImageUrl) {
      return;
    }

    setIsPrinting(true);

    const existingRoot = document.getElementById(PRINT_ROOT_ID);
    if (existingRoot) {
      existingRoot.remove();
    }

    const printRoot = document.createElement('div');
    printRoot.id = PRINT_ROOT_ID;
    printRoot.style.display = 'none';

    const printImage = document.createElement('img');
    printImage.src = capturedImageUrl;
    printImage.alt = 'QC Chart';
    printImage.style.width = '100%';
    printImage.style.height = 'auto';
    printImage.style.maxHeight = '100vh';
    printImage.style.objectFit = 'contain';

    printRoot.appendChild(printImage);
    document.body.appendChild(printRoot);

    const cleanup = () => {
      const root = document.getElementById(PRINT_ROOT_ID);
      if (root) {
        root.remove();
      }
      setIsPrinting(false);
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);

    try {
      await waitForImageReady(printImage);
      window.requestAnimationFrame(() => {
        try {
          window.print();
        } catch (caughtError) {
          cleanup();
          error(
            caughtError instanceof Error
              ? caughtError.message
              : 'Unable to open the print dialog.',
          );
        }
      });
    } catch (caughtError) {
      cleanup();
      error(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to open the print dialog.',
      );
    }
  }, [capturedImageUrl, error]);

  const isBusy = isCapturing || isPrinting || isDownloading;
  const actionsDisabled = !capturedImageUrl || isBusy;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="no-print w-full max-w-4xl sm:max-w-4xl">
        <DialogHeader className="no-print">
          <DialogTitle>Print / Export Chart</DialogTitle>
          <DialogDescription>
            Review the print-ready layout before downloading or printing.
          </DialogDescription>
        </DialogHeader>

        <div className="no-print">
          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
            Print Preview
          </p>
          <div className="mt-2 max-h-[500px] overflow-auto rounded-lg bg-gray-100 p-4">
            {isCapturing && (
              <div className="flex h-[420px] flex-col items-center justify-center gap-3 text-[#6b7280]">
                <SpinnerIcon size={28} className="animate-spin text-[#1a1aff]" />
                <span className="text-sm">Preparing preview...</span>
              </div>
            )}
            {!isCapturing && capturedImageUrl && (
              <img
                src={capturedImageUrl}
                alt="QC Chart preview"
                className="w-full rounded shadow-md"
              />
            )}
            {!isCapturing && !capturedImageUrl && (
              <div className="flex h-[420px] items-center justify-center rounded border border-dashed border-[#d1d5db] bg-white text-center text-sm text-[#6b7280]">
                Preview unavailable - you can still print or download.
              </div>
            )}
          </div>
          <p className="mt-2 text-[11px] text-[#9ca3af]">
            Preview is approximate. Actual output may vary slightly by printer or PDF viewer.
          </p>
        </div>

        <DialogFooter className="no-print">
          <Button
            type="button"
            variant="outline"
            disabled={actionsDisabled}
            onClick={handleDownload}
            className="gap-1.5"
          >
            {isDownloading ? (
              <>
                <SpinnerIcon size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FilePdfIcon weight="regular" size={16} />
                Download PDF
              </>
            )}
          </Button>
          <Button
            type="button"
            disabled={actionsDisabled}
            onClick={handlePrint}
            className="gap-1.5"
          >
            {isPrinting ? (
              <>
                <SpinnerIcon size={16} className="animate-spin" />
                Printing...
              </>
            ) : (
              <>
                <PrinterIcon weight="regular" size={16} />
                Print
              </>
            )}
          </Button>
        </DialogFooter>

        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            pointerEvents: 'none',
          }}
        >
          <PrintableQCLayout
            ref={layoutRef}
            disease={disease}
            controlType={controlType}
            controlLabel={controlLabel}
            year={year}
            mean={mean}
            sd={sd}
            cv={cv}
            totalRuns={totalRuns}
            lotNumber={lotNumber}
            chartData={chartData}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExportModal;
