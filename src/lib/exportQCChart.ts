import type { PDFExportMetadata } from '@/types/export';

export async function captureLayout(element: HTMLElement): Promise<string> {
  const { default: html2canvas } = await import('html2canvas');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  return canvas.toDataURL('image/png');
}

/**
 * Writes one captured image per A4 landscape page, each scaled to fit inside
 * the page margins while preserving its aspect ratio.
 */
export async function downloadAsMultiPagePDF(
  imageDataUrls: string[],
  filename: string,
): Promise<void> {
  if (imageDataUrls.length === 0) {
    throw new Error('There is nothing to export.');
  }

  const { default: jsPDF } = await import('jspdf');

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const maxImageWidth = pageWidth - margin * 2;
  const maxImageHeight = pageHeight - margin * 2;

  imageDataUrls.forEach((imageDataUrl, index) => {
    if (index > 0) {
      pdf.addPage();
    }

    const imageProperties = pdf.getImageProperties(imageDataUrl);
    const imageRatio = imageProperties.width / imageProperties.height;

    let renderWidth = maxImageWidth;
    let renderHeight = renderWidth / imageRatio;

    if (renderHeight > maxImageHeight) {
      renderHeight = maxImageHeight;
      renderWidth = renderHeight * imageRatio;
    }

    pdf.addImage(
      imageDataUrl,
      'PNG',
      (pageWidth - renderWidth) / 2,
      (pageHeight - renderHeight) / 2,
      renderWidth,
      renderHeight,
      undefined,
      'FAST',
    );
  });

  pdf.save(filename);
}

export async function downloadAsPDF(
  imageDataUrl: string,
  metadata: PDFExportMetadata,
): Promise<void> {
  const safeDisease = metadata.disease.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const safeControlLabel = metadata.controlLabel.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const filename = `QC_CHART_${safeDisease}_${safeControlLabel}_${metadata.year}.pdf`;

  await downloadAsMultiPagePDF([imageDataUrl], filename);
}
