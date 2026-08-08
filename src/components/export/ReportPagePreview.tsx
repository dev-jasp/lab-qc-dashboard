interface ReportPagePreviewProps {
  /** Captured page image, as produced by captureLayout. */
  src: string;
  alt: string;
}

/**
 * One preview sheet, drawn to the geometry the PDF actually uses.
 *
 * downloadAsMultiPagePDF writes A4 landscape (297x210mm) with an 8mm margin
 * and centres each capture inside it, aspect preserved — so the sheet is
 * 297/210 with 2.7% padding (8mm as a fraction of the 297mm width) and the
 * image is fitted with object-contain.
 *
 * The width cap is derived from the height rather than set directly, so a
 * whole sheet fits the 72vh scroll area instead of being cropped; the 8rem
 * accounts for the scroll container's padding and the surrounding chrome.
 */
export function ReportPagePreview({ src, alt }: ReportPagePreviewProps) {
  return (
    <div className="mx-auto flex aspect-[297/210] w-full max-w-[calc((72vh-8rem)*1.414)] items-center justify-center rounded bg-white p-[2.7%] shadow-md">
      <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
    </div>
  );
}

export default ReportPagePreview;
