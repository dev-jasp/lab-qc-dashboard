/**
 * Saves a blob to the user's downloads folder.
 *
 * The anchor must be attached to the document before clicking, and the object
 * URL must outlive the click, otherwise Firefox and Safari drop the download.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
