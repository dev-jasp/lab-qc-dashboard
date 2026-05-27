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

export async function downloadAsPDF(
  imageDataUrl: string,
  metadata: PDFExportMetadata,
): Promise<void> {
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
  const imageProperties = pdf.getImageProperties(imageDataUrl);
  const imageRatio = imageProperties.width / imageProperties.height;

  let renderWidth = maxImageWidth;
  let renderHeight = renderWidth / imageRatio;

  if (renderHeight > maxImageHeight) {
    renderHeight = maxImageHeight;
    renderWidth = renderHeight * imageRatio;
  }

  const renderX = (pageWidth - renderWidth) / 2;
  const renderY = (pageHeight - renderHeight) / 2;

  pdf.addImage(
    imageDataUrl,
    'PNG',
    renderX,
    renderY,
    renderWidth,
    renderHeight,
    undefined,
    'FAST',
  );

  const safeDisease = metadata.disease.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const safeControlLabel = metadata.controlLabel.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const filename = `QC_CHART_${safeDisease}_${safeControlLabel}_${metadata.year}.pdf`;

  pdf.save(filename);
}
