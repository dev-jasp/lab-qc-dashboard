import { FilePdfIcon, SpinnerIcon } from '@phosphor-icons/react';
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
import { captureLayout, downloadAsMultiPagePDF } from '@/lib/exportQCChart';

import { PrintableQCLayout, type PrintableQCLayoutProps } from './PrintableQCLayout';

export interface ExportReportDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  filename: string;
  /** One letterheaded page per section. A whole-disease report passes three. */
  sections: PrintableQCLayoutProps[];
}

/**
 * Renders every section offscreen, captures each as a PNG, and writes them into
 * a single multi-page PDF.
 *
 * Chart.js needs a frame to lay out before html2canvas can see it, hence the
 * settle delay before capturing — the same approach ExportModal uses.
 */
export function ExportReportDialog({
  open,
  onClose,
  title,
  description,
  filename,
  sections,
}: ExportReportDialogProps) {
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    if (!open) {
      setPreviewUrls([]);
      return;
    }

    let isCancelled = false;
    setPreviewUrls([]);
    setIsCapturing(true);

    const timer = window.setTimeout(async () => {
      try {
        const elements = sectionRefs.current.slice(0, sections.length);
        const urls: string[] = [];

        for (const element of elements) {
          if (!element) {
            continue;
          }
          urls.push(await captureLayout(element));
        }

        if (!isCancelled) {
          setPreviewUrls(urls);
        }
      } catch (caughtError) {
        if (!isCancelled) {
          error(
            caughtError instanceof Error
              ? caughtError.message
              : 'Unable to prepare the report preview.',
          );
        }
      } finally {
        if (!isCancelled) {
          setIsCapturing(false);
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, sections, error]);

  const handleDownload = useCallback(async () => {
    if (previewUrls.length === 0) {
      return;
    }

    setIsDownloading(true);
    try {
      await downloadAsMultiPagePDF(previewUrls, filename);
      success(`${filename} downloaded`);
      onClose();
    } catch (caughtError) {
      error(
        caughtError instanceof Error ? caughtError.message : 'Unable to generate the PDF file.',
      );
    } finally {
      setIsDownloading(false);
    }
  }, [error, filename, onClose, previewUrls, success]);

  const pageLabel = sections.length === 1 ? '1 page' : `${sections.length} pages`;

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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="no-print">
          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
            {`Report Preview · ${pageLabel}`}
          </p>
          <div className="mt-2 max-h-[500px] space-y-4 overflow-auto rounded-lg bg-gray-100 p-4">
            {isCapturing && (
              <div className="flex h-[420px] flex-col items-center justify-center gap-3 text-[#6b7280]">
                <SpinnerIcon size={28} className="animate-spin text-[#1a1aff]" />
                <span className="text-sm">Preparing report...</span>
              </div>
            )}
            {!isCapturing &&
              previewUrls.map((url, index) => (
                <img
                  key={url.slice(-32) + index}
                  src={url}
                  alt={`Report page ${index + 1}`}
                  className="w-full rounded shadow-md"
                />
              ))}
            {!isCapturing && previewUrls.length === 0 && (
              <div className="flex h-[420px] items-center justify-center rounded border border-dashed border-[#d1d5db] bg-white text-center text-sm text-[#6b7280]">
                Preview unavailable for this selection.
              </div>
            )}
          </div>
          <p className="mt-2 text-[11px] text-[#9ca3af]">
            Preview is approximate. Actual output may vary slightly by PDF viewer.
          </p>
        </div>

        <DialogFooter className="no-print">
          <Button
            type="button"
            disabled={previewUrls.length === 0 || isCapturing || isDownloading}
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
          {sections.map((section, index) => (
            <PrintableQCLayout
              key={`${section.disease}-${section.controlType}-${section.lotNumber ?? index}`}
              ref={(element) => {
                sectionRefs.current[index] = element;
              }}
              {...section}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExportReportDialog;
